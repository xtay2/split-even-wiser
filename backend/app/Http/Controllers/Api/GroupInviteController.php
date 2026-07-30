<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupInvite;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupInviteController extends Controller
{
    private const TTL_MINUTES_BY_OPTION = [
        'never' => null,
        '15_minutes' => 15,
        '1_day' => 60 * 24,
        '1_week' => 60 * 24 * 7,
        '3_months' => 60 * 24 * 90,
        '1_year' => 60 * 24 * 365,
    ];

    public function store(Request $request, Group $group): JsonResponse
    {
        $this->authorize('manageInviteLink', $group);

        $data = $request->validate([
            'expires_in' => ['required', 'string', 'in:'.implode(',', array_keys(self::TTL_MINUTES_BY_OPTION))],
        ]);

        ['invite' => $invite, 'token' => $token] = GroupInvite::issueFor(
            $group,
            $request->user(),
            self::TTL_MINUTES_BY_OPTION[$data['expires_in']],
        );

        return response()->json([
            'url' => sprintf(
                '%s/invite/%s',
                rtrim(config('app.frontend_url'), '/'),
                $token,
            ),
            'expires_at' => $invite->expires_at,
        ], 201);
    }

    public function show(Request $request, string $token): JsonResponse
    {
        $invite = GroupInvite::findValid($token);

        abort_if($invite === null, 404, 'This invite link is invalid or has expired.');

        return response()->json([
            'group' => $invite->group->only(['id', 'name', 'description']),
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $invite = GroupInvite::findValid($token);

        abort_if($invite === null, 404, 'This invite link is invalid or has expired.');

        $group = $invite->group;
        $user = $request->user();

        $existingMembership = $group->groupMembers()->where('user_id', $user->id)->first();

        if ($existingMembership && $existingMembership->left_at === null) {
            // Already a member - joining again via the same link is a no-op, not an error.
        } elseif ($existingMembership) {
            $existingMembership->update(['joined_at' => now(), 'left_at' => null]);
        } else {
            try {
                $group->groupMembers()->create(['user_id' => $user->id, 'joined_at' => now()]);
            } catch (QueryException $e) {
                // Unique constraint on (group_id, user_id) while active - a duplicate request for
                // the same invite (e.g. a client effect firing twice) already created the
                // membership between our check above and this insert; nothing left to do.
                if (! str_contains($e->getMessage(), 'group_members_active_unique')) {
                    throw $e;
                }
            }
        }

        return response()->json($group->fresh('members'));
    }
}
