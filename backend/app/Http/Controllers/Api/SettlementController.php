<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SettlementController extends Controller
{
    public function index(Request $request, Group $group): JsonResponse
    {
        $this->authorize('view', $group);

        return response()->json(
            $group->settlements()->with(['fromUser', 'toUser'])->latest('id')->get(),
        );
    }

    public function store(Request $request, Group $group): JsonResponse
    {
        $this->authorize('view', $group);

        $activeMemberIds = $group->groupMembers()->whereNull('left_at')->pluck('user_id');

        $data = $request->validate([
            'to_user_id' => ['required', 'integer', 'in:'.$activeMemberIds->implode(',')],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['required', 'string', 'size:3'],
        ]);

        if ($data['to_user_id'] === $request->user()->id) {
            throw ValidationException::withMessages(['to_user_id' => 'You cannot settle a debt with yourself.']);
        }

        // You can only declare your own debts settled, per the spec — settlements are
        // recorded as being made by the currently authenticated user.
        $settlement = $group->settlements()->create([
            'from_user_id' => $request->user()->id,
            'to_user_id' => $data['to_user_id'],
            'amount' => $data['amount'],
            'currency' => strtoupper($data['currency']),
            'created_by' => $request->user()->id,
        ]);

        return response()->json($settlement->fresh(['fromUser', 'toUser']), 201);
    }
}
