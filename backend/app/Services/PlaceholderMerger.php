<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\ExpenseVersion;
use App\Models\ExpenseVersionShare;
use App\Models\Friendship;
use App\Models\GroupMember;
use App\Models\LoginToken;
use App\Models\PlaceholderClaim;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Folds a placeholder User's group memberships, expenses, settlements, and friendships into
 * a real account the placeholder has been identified as ("That's me"), then deletes the
 * now-empty placeholder row. Used when the claimant already has their own separate account —
 * the alternative path (clicking the invite email's magic login link) logs straight into the
 * placeholder row itself and needs no merge, see AuthController::verify.
 */
class PlaceholderMerger
{
    public function merge(User $placeholder, User $claimant): void
    {
        DB::transaction(function () use ($placeholder, $claimant) {
            // Lock the row so a concurrent double-claim fails cleanly instead of racing.
            $placeholder = User::whereKey($placeholder->id)->lockForUpdate()->firstOrFail();

            // Captured before mergeGroupMemberships() mutates these rows, so every group the
            // placeholder belonged to gets a history entry — not just the one the claim was
            // made from.
            $groupIds = GroupMember::where('user_id', $placeholder->id)->pluck('group_id')->unique();

            $this->mergeGroupMemberships($placeholder, $claimant);
            $this->mergeExpenses($placeholder, $claimant);
            $this->mergeExpenseShares($placeholder, $claimant);
            $this->mergeSettlements($placeholder, $claimant);
            $this->mergeFriendships($placeholder, $claimant);
            $this->recordClaim($placeholder, $claimant, $groupIds);

            if ($placeholder->email !== null) {
                LoginToken::where('email', $placeholder->email)->update(['consumed_at' => now()]);
            }

            $placeholder->delete();
        });
    }

    private function mergeGroupMemberships(User $placeholder, User $claimant): void
    {
        GroupMember::where('user_id', $placeholder->id)->get()->each(function (GroupMember $membership) use ($claimant) {
            $claimantIsActiveHere = GroupMember::where('group_id', $membership->group_id)
                ->where('user_id', $claimant->id)
                ->whereNull('left_at')
                ->exists();

            if ($claimantIsActiveHere) {
                // Claimant is already an active member of this group — just close out the
                // placeholder's row rather than creating a second membership for the same person.
                $membership->update(['left_at' => $membership->left_at ?? now()]);
            } else {
                $membership->update(['user_id' => $claimant->id]);
            }
        });
    }

    private function mergeExpenses(User $placeholder, User $claimant): void
    {
        Expense::withTrashed()->where('created_by', $placeholder->id)->update(['created_by' => $claimant->id]);

        ExpenseVersion::where('paid_by', $placeholder->id)->update(['paid_by' => $claimant->id]);
        ExpenseVersion::where('created_by', $placeholder->id)->update(['created_by' => $claimant->id]);
    }

    private function mergeExpenseShares(User $placeholder, User $claimant): void
    {
        ExpenseVersionShare::where('user_id', $placeholder->id)->get()->each(function (ExpenseVersionShare $share) use ($claimant) {
            $existing = ExpenseVersionShare::where('expense_version_id', $share->expense_version_id)
                ->where('user_id', $claimant->id)
                ->first();

            if ($existing) {
                $existing->update([
                    'share_amount' => bcadd((string) $existing->share_amount, (string) $share->share_amount, 2),
                ]);
                $share->delete();
            } else {
                $share->update(['user_id' => $claimant->id]);
            }
        });
    }

    private function mergeSettlements(User $placeholder, User $claimant): void
    {
        Settlement::withTrashed()->where('from_user_id', $placeholder->id)->update(['from_user_id' => $claimant->id]);
        Settlement::withTrashed()->where('to_user_id', $placeholder->id)->update(['to_user_id' => $claimant->id]);
        Settlement::withTrashed()->where('created_by', $placeholder->id)->update(['created_by' => $claimant->id]);

        // A settlement that was between just the placeholder and the claimant is now a
        // self-settlement — moot, so retire it the same way SettlementController::destroy does.
        Settlement::withTrashed()
            ->where('from_user_id', $claimant->id)
            ->whereColumn('from_user_id', 'to_user_id')
            ->get()
            ->each(fn (Settlement $settlement) => $settlement->delete());
    }

    private function mergeFriendships(User $placeholder, User $claimant): void
    {
        Friendship::where('requester_id', $placeholder->id)
            ->orWhere('addressee_id', $placeholder->id)
            ->get()
            ->each(function (Friendship $friendship) use ($placeholder, $claimant) {
                $requesterId = $friendship->requester_id === $placeholder->id ? $claimant->id : $friendship->requester_id;
                $addresseeId = $friendship->addressee_id === $placeholder->id ? $claimant->id : $friendship->addressee_id;

                // Claiming a placeholder you yourself invited turns the auto-friendship into a
                // self-friendship — drop it. Same if the claimant already has an unrelated
                // friendship row with the other side (UNIQUE(requester_id, addressee_id)).
                if ($requesterId === $addresseeId) {
                    $friendship->delete();

                    return;
                }

                $conflicts = Friendship::where('requester_id', $requesterId)
                    ->where('addressee_id', $addresseeId)
                    ->where('id', '!=', $friendship->id)
                    ->exists();

                if ($conflicts) {
                    $friendship->delete();

                    return;
                }

                $friendship->update(['requester_id' => $requesterId, 'addressee_id' => $addresseeId]);
            });
    }

    /**
     * @param  Collection<int, int>  $groupIds
     */
    private function recordClaim(User $placeholder, User $claimant, Collection $groupIds): void
    {
        foreach ($groupIds as $groupId) {
            PlaceholderClaim::create([
                'group_id' => $groupId,
                'claimant_id' => $claimant->id,
                'placeholder_username' => $placeholder->username,
                'placeholder_display_name' => $placeholder->display_name,
            ]);
        }
    }
}
