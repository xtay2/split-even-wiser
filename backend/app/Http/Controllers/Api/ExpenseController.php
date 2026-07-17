<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    public function index(Request $request, Group $group): JsonResponse
    {
        $this->authorize('view', $group);

        $expenses = $group->expenses()
            ->whereNull('deleted_at')
            ->with(['currentVersion.shares', 'currentVersion.payer', 'creator'])
            ->latest('id')
            ->get();

        return response()->json($expenses);
    }

    public function store(Request $request, Group $group): JsonResponse
    {
        $this->authorize('view', $group);

        $clientUuid = $request->validate([
            'client_uuid' => ['nullable', 'uuid'],
        ])['client_uuid'] ?? null;

        // Offline clients resend the same client_uuid when a sync retry follows a dropped
        // connection; returning the original record keeps the retry idempotent instead of
        // creating a duplicate expense.
        if ($clientUuid !== null) {
            $existing = $group->expenses()->where('client_uuid', $clientUuid)->first();
            if ($existing !== null) {
                return response()->json(
                    $existing->load(['currentVersion.shares', 'currentVersion.payer', 'creator']),
                    200,
                );
            }
        }

        $data = $this->validateVersionPayload($request, $group);
        $data['paid_by'] ??= $request->user()->id;

        $expense = DB::transaction(function () use ($group, $data, $request, $clientUuid) {
            $expense = Expense::create([
                'group_id' => $group->id,
                'created_by' => $request->user()->id,
                'client_uuid' => $clientUuid,
            ]);

            $version = $this->createVersion($expense, 1, $data, $request->user()->id);

            $expense->update(['current_version_id' => $version->id]);

            return $expense;
        });

        return response()->json(
            $expense->fresh(['currentVersion.shares', 'currentVersion.payer', 'creator']),
            201,
        );
    }

    public function show(Request $request, Group $group, Expense $expense): JsonResponse
    {
        $this->authorizeExpenseInGroup($group, $expense);
        $this->authorize('view', $expense);

        return response()->json($expense->load(['currentVersion.shares', 'currentVersion.payer', 'creator']));
    }

    public function update(Request $request, Group $group, Expense $expense): JsonResponse
    {
        $this->authorizeExpenseInGroup($group, $expense);
        $this->authorize('update', $expense);

        $data = $this->validateVersionPayload($request, $group);
        $data['paid_by'] ??= $expense->currentVersion->paid_by;

        $expense = DB::transaction(function () use ($expense, $data, $request) {
            $nextVersionNo = $expense->versions()->max('version_no') + 1;

            $version = $this->createVersion($expense, $nextVersionNo, $data, $request->user()->id);

            $expense->update(['current_version_id' => $version->id]);

            return $expense;
        });

        return response()->json(
            $expense->fresh(['currentVersion.shares', 'currentVersion.payer', 'creator']),
        );
    }

    public function destroy(Request $request, Group $group, Expense $expense): JsonResponse
    {
        $this->authorizeExpenseInGroup($group, $expense);
        $this->authorize('delete', $expense);

        $expense->delete();

        return response()->json(status: 204);
    }

    public function history(Request $request, Group $group, Expense $expense): JsonResponse
    {
        $this->authorizeExpenseInGroup($group, $expense);
        $this->authorize('view', $expense);

        return response()->json($expense->versions()->with(['shares', 'payer', 'creator'])->get());
    }

    /**
     * @return array{title: string, amount: string, currency: string, date: string, paid_by: ?int, shares: array<int, array{user_id: int, amount: string}>}
     */
    private function validateVersionPayload(Request $request, Group $group): array
    {
        $activeMemberIds = $group->groupMembers()->whereNull('left_at')->pluck('user_id');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['required', 'string', 'size:3'],
            'date' => ['required', 'date'],
            'paid_by' => ['nullable', 'integer', 'in:'.$activeMemberIds->implode(',')],
            'shares' => ['required', 'array', 'min:1'],
            'shares.*.user_id' => ['required', 'integer', 'in:'.$activeMemberIds->implode(',')],
            'shares.*.amount' => ['required', 'numeric', 'min:0'],
        ]);

        $shareTotal = collect($data['shares'])->reduce(
            fn (string $carry, array $share) => bcadd($carry, (string) $share['amount'], 2),
            '0.00',
        );

        if (bccomp($shareTotal, (string) $data['amount'], 2) !== 0) {
            throw ValidationException::withMessages([
                'shares' => "Shares must add up to the total amount ({$data['amount']}), got {$shareTotal}.",
            ]);
        }

        $userIds = collect($data['shares'])->pluck('user_id');
        if ($userIds->count() !== $userIds->unique()->count()) {
            throw ValidationException::withMessages(['shares' => 'Each participant may only appear once.']);
        }

        return [
            'title' => $data['title'],
            'amount' => (string) $data['amount'],
            'currency' => strtoupper($data['currency']),
            'date' => $data['date'],
            'paid_by' => $data['paid_by'] ?? null,
            'shares' => $data['shares'],
        ];
    }

    private function createVersion(Expense $expense, int $versionNo, array $data, int $editorId)
    {
        $version = $expense->versions()->create([
            'version_no' => $versionNo,
            'title' => $data['title'],
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'date' => $data['date'],
            'paid_by' => $data['paid_by'],
            'created_by' => $editorId,
        ]);

        $version->shares()->createMany(
            collect($data['shares'])->map(fn (array $share) => [
                'user_id' => $share['user_id'],
                'share_amount' => $share['amount'],
            ]),
        );

        return $version;
    }

    private function authorizeExpenseInGroup(Group $group, Expense $expense): void
    {
        abort_unless($expense->group_id === $group->id, 404);
    }
}
