<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Settlement;
use App\Models\User;
use App\Notifications\SettlementRecorded;
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

    public function show(Request $request, Group $group, Settlement $settlement): JsonResponse
    {
        $this->authorizeSettlementInGroup($group, $settlement);
        $this->authorize('view', $settlement);

        return response()->json($settlement->load(['fromUser', 'toUser']));
    }

    public function store(Request $request, Group $group): JsonResponse
    {
        $this->authorize('view', $group);

        $data = $this->validatePayload($request, $group, $request->user()->id);

        // Offline clients resend the same client_uuid when a sync retry follows a dropped
        // connection; returning the original record keeps the retry idempotent instead of
        // creating a duplicate settlement.
        if (isset($data['client_uuid'])) {
            $existing = $group->settlements()->where('client_uuid', $data['client_uuid'])->first();
            if ($existing !== null) {
                return response()->json($existing->load(['fromUser', 'toUser']), 200);
            }
        }

        // Any active member can record a settlement on behalf of another member (e.g. for a
        // placeholder or someone without the app); the payer defaults to the current user.
        $settlement = $group->settlements()->create([
            'from_user_id' => $data['from_user_id'],
            'to_user_id' => $data['to_user_id'],
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'date' => $data['date'],
            'created_by' => $request->user()->id,
            'client_uuid' => $data['client_uuid'] ?? null,
        ]);

        $this->notifyParticipants($group, $settlement, $request->user());

        return response()->json($settlement->fresh(['fromUser', 'toUser']), 201);
    }

    public function update(Request $request, Group $group, Settlement $settlement): JsonResponse
    {
        $this->authorizeSettlementInGroup($group, $settlement);
        $this->authorize('update', $settlement);

        $data = $this->validatePayload($request, $group, $settlement->from_user_id);

        $settlement->update([
            'from_user_id' => $data['from_user_id'],
            'to_user_id' => $data['to_user_id'],
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'date' => $data['date'],
        ]);

        return response()->json($settlement->fresh(['fromUser', 'toUser']));
    }

    public function destroy(Request $request, Group $group, Settlement $settlement): JsonResponse
    {
        $this->authorizeSettlementInGroup($group, $settlement);
        $this->authorize('delete', $settlement);

        $settlement->delete();

        return response()->json(status: 204);
    }

    /**
     * Notifies both sides of the settlement, except whoever recorded it.
     */
    private function notifyParticipants(Group $group, Settlement $settlement, User $recordedBy): void
    {
        foreach ([$settlement->fromUser, $settlement->toUser] as $participant) {
            if ($participant->id === $recordedBy->id) {
                continue;
            }

            $participant->notify(new SettlementRecorded(
                $group,
                $settlement,
                $recordedBy,
                (string) $settlement->amount,
                $settlement->currency,
            ));
        }
    }

    /**
     * @param  int  $defaultFromUserId  The payer used when the request doesn't name one.
     * @return array{from_user_id: int, to_user_id: int, amount: string, currency: string, date: string, client_uuid?: string}
     */
    private function validatePayload(Request $request, Group $group, int $defaultFromUserId): array
    {
        $activeMemberIds = $group->groupMembers()->whereNull('left_at')->pluck('user_id');

        $data = $request->validate([
            'from_user_id' => ['sometimes', 'integer', 'in:'.$activeMemberIds->implode(',')],
            'to_user_id' => ['required', 'integer', 'in:'.$activeMemberIds->implode(',')],
            'amount' => ['required', 'numeric', 'min:0.01', 'regex:/^\d+(\.\d{1,2})?$/'],
            'currency' => ['required', 'string', 'size:3', 'regex:/^[A-Za-z]{3}$/'],
            'date' => ['required', 'date'],
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        $data['from_user_id'] ??= $defaultFromUserId;

        if ($data['to_user_id'] === $data['from_user_id']) {
            throw ValidationException::withMessages(['to_user_id' => 'Payer and recipient must be different people.']);
        }

        $data['currency'] = strtoupper($data['currency']);

        return $data;
    }

    private function authorizeSettlementInGroup(Group $group, Settlement $settlement): void
    {
        abort_unless($settlement->group_id === $group->id, 404);
    }
}
