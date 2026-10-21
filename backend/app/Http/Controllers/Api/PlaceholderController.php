<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\GroupInviteMail;
use App\Models\Friendship;
use App\Models\Group;
use App\Models\LoginToken;
use App\Models\User;
use App\Services\PlaceholderMerger;
use App\Services\PlaceholderUsernameGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PlaceholderController extends Controller
{
    private const INVITE_TOKEN_TTL_MINUTES = 60 * 24 * 7; // 1 week

    public function store(Request $request, Group $group, PlaceholderUsernameGenerator $usernames): JsonResponse
    {
        $this->authorize('addPlaceholder', $group);

        $clientUuid = $request->validate([
            'client_uuid' => ['nullable', 'uuid'],
        ])['client_uuid'] ?? null;

        // Offline clients resend the same client_uuid when a sync retry follows a dropped
        // connection. Checked before validation, since the retried email/name would otherwise
        // be rejected as already taken by the placeholder the first attempt created.
        if ($clientUuid !== null) {
            $existing = $group->members()
                ->where('users.client_uuid', $clientUuid)
                ->where('is_placeholder', true)
                ->first();
            if ($existing !== null) {
                return response()->json([
                    'group' => $group->fresh('members'),
                    'placeholder' => $existing,
                ], 200);
            }
        }

        $data = $request->validate([
            'name' => ['nullable', 'required_without:email', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:name', 'email', 'max:255', 'unique:users,email'],
        ]);

        $name = ! empty($data['name']) ? $data['name'] : explode('@', $data['email'])[0];

        $duplicateName = $group->members()
            ->where('is_placeholder', true)
            ->whereRaw('LOWER(display_name) = ?', [mb_strtolower(trim($name))])
            ->exists();

        if ($duplicateName) {
            throw ValidationException::withMessages([
                'name' => 'This group already has a placeholder with that name.',
            ]);
        }

        $placeholder = User::create([
            'username' => $usernames->generate($name),
            'display_name' => $name,
            'email' => $data['email'] ?? null,
            'is_placeholder' => true,
            'invited_by' => $request->user()->id,
            'client_uuid' => $clientUuid,
        ]);

        $group->groupMembers()->create(['user_id' => $placeholder->id, 'joined_at' => now()]);

        if (! empty($data['email'])) {
            $inviter = $request->user();
            ['token' => $token] = LoginToken::issueFor($data['email'], self::INVITE_TOKEN_TTL_MINUTES);

            Mail::to($data['email'])->send(new GroupInviteMail(
                $data['email'],
                $token,
                $inviter->display_name ?: $inviter->username,
                $group->name,
            ));

            // Auto-accepted, no FriendRequestReceived push - the placeholder didn't choose
            // this, it's a byproduct of being invited, not a request they need to act on.
            Friendship::create([
                'requester_id' => $inviter->id,
                'addressee_id' => $placeholder->id,
                'status' => 'accepted',
            ]);
        }

        return response()->json([
            'group' => $group->fresh('members'),
            'placeholder' => $placeholder,
        ], 201);
    }

    public function claim(Request $request, Group $group, User $user, PlaceholderMerger $merger): JsonResponse
    {
        $this->authorize('claimPlaceholder', $group);

        abort_if($user->id === $request->user()->id, 422, 'You cannot claim yourself.');
        abort_unless($user->is_placeholder, 404, 'This member cannot be claimed.');

        $merger->merge($user, $request->user());

        return response()->json($group->fresh('members'));
    }
}
