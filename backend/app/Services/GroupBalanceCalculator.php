<?php

namespace App\Services;

use App\Models\Group;
use App\Models\User;

class GroupBalanceCalculator
{
    /**
     * Net balance per user per currency within a group. Positive means the group owes this
     * user money; negative means this user owes the group. Computed on-demand from the current
     * version of every non-deleted expense plus all settlements — never cached/stored.
     *
     * @return array<int, array<string, string>> user_id => [currency => decimal string]
     */
    public function netBalances(Group $group): array
    {
        $balances = [];

        $add = function (int $userId, string $currency, string $delta) use (&$balances): void {
            $balances[$userId][$currency] = bcadd($balances[$userId][$currency] ?? '0.00', $delta, 2);
        };

        $expenses = $group->expenses()
            ->whereNull('deleted_at')
            ->with('currentVersion.shares')
            ->get();

        foreach ($expenses as $expense) {
            $version = $expense->currentVersion;

            if (! $version) {
                continue;
            }

            $add($version->paid_by, $version->currency, (string) $version->amount);

            foreach ($version->shares as $share) {
                $add($share->user_id, $version->currency, bcmul((string) $share->share_amount, '-1', 2));
            }
        }

        foreach ($group->settlements()->get() as $settlement) {
            $add($settlement->from_user_id, $settlement->currency, (string) $settlement->amount);
            $add($settlement->to_user_id, $settlement->currency, bcmul((string) $settlement->amount, '-1', 2));
        }

        return $balances;
    }

    /**
     * A member is "quitt" once their net balance is zero in every currency they've touched.
     */
    public function isQuitt(Group $group, User $user): bool
    {
        foreach ($this->netBalances($group)[$user->id] ?? [] as $amount) {
            if (bccomp($amount, '0.00', 2) !== 0) {
                return false;
            }
        }

        return true;
    }
}
