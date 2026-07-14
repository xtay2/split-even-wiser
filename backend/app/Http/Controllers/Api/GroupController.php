<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\User;
use App\Services\GroupBalanceCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->groups()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $group = Group::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        $group->groupMembers()->create([
            'user_id' => $request->user()->id,
            'joined_at' => now(),
        ]);

        return response()->json($group->fresh('members'), 201);
    }

    public function show(Request $request, Group $group): JsonResponse
    {
        $this->authorize('view', $group);

        return response()->json($group->load('members'));
    }

    public function update(Request $request, Group $group): JsonResponse
    {
        $this->authorize('update', $group);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $group->update($data);

        return response()->json($group->fresh('members'));
    }

    public function addMember(Request $request, Group $group): JsonResponse
    {
        $this->authorize('addMember', $group);

        $data = $request->validate([
            'identifier' => ['required', 'string'],
        ]);

        $target = User::query()
            ->where('username', $data['identifier'])
            ->orWhere('email', $data['identifier'])
            ->first();

        if (! $target) {
            throw ValidationException::withMessages(['identifier' => 'No matching user was found.']);
        }

        $existingMembership = $group->groupMembers()->where('user_id', $target->id)->first();

        if ($existingMembership && $existingMembership->left_at === null) {
            throw ValidationException::withMessages(['identifier' => 'This user is already a member.']);
        }

        if ($existingMembership) {
            $existingMembership->update(['joined_at' => now(), 'left_at' => null]);
        } else {
            $group->groupMembers()->create(['user_id' => $target->id, 'joined_at' => now()]);
        }

        return response()->json($group->fresh('members'));
    }

    public function leave(Request $request, Group $group, User $user, GroupBalanceCalculator $balances): JsonResponse
    {
        abort_unless($user->id === $request->user()->id, 403, 'You can only remove yourself from a group.');

        $membership = $group->groupMembers()->where('user_id', $user->id)->whereNull('left_at')->first();

        abort_if($membership === null, 404, 'You are not a member of this group.');

        abort_unless(
            $balances->isQuitt($group, $user),
            409,
            'You must settle all balances in this group before leaving.',
        );

        $membership->update(['left_at' => now()]);

        return response()->json(status: 204);
    }
}
