<?php

namespace App\Services;

use App\Models\Group;

class DebtSimplifier
{
    public function __construct(
        private readonly GroupBalanceCalculator $balanceCalculator,
    ) {}

    /**
     * Reduces a group's net balances to the minimal set of payments needed to settle
     * everyone up, per currency. Debts are never mixed across currencies (per product
     * decision — no FX conversion). This is what makes "A owes B, B owes C" collapse to
     * "A owes C" in the spec's example, since B's net balance nets out to zero.
     *
     * @return array<int, array{from_user_id: int, to_user_id: int, amount: string, currency: string}>
     */
    public function simplify(Group $group): array
    {
        $byCurrency = [];

        foreach ($this->balanceCalculator->netBalances($group) as $userId => $currencies) {
            foreach ($currencies as $currency => $amount) {
                if (bccomp($amount, '0.00', 2) === 0) {
                    continue;
                }

                $byCurrency[$currency][$userId] = $amount;
            }
        }

        $transactions = [];

        foreach ($byCurrency as $currency => $balances) {
            foreach ($this->simplifyCurrency($balances) as $transaction) {
                $transactions[] = [...$transaction, 'currency' => $currency];
            }
        }

        return $transactions;
    }

    /**
     * Greedily matches the largest creditor against the largest debtor until every
     * balance nets to zero — the standard practical "simplify debts" algorithm.
     *
     * @param  array<int, string>  $balances  user_id => signed decimal amount
     * @return array<int, array{from_user_id: int, to_user_id: int, amount: string}>
     */
    private function simplifyCurrency(array $balances): array
    {
        $creditors = [];
        $debtors = [];

        foreach ($balances as $userId => $amount) {
            if (bccomp($amount, '0.00', 2) > 0) {
                $creditors[] = ['user_id' => $userId, 'amount' => $amount];
            } else {
                $debtors[] = ['user_id' => $userId, 'amount' => bcmul($amount, '-1', 2)];
            }
        }

        usort($creditors, fn ($a, $b) => bccomp($b['amount'], $a['amount'], 2));
        usort($debtors, fn ($a, $b) => bccomp($b['amount'], $a['amount'], 2));

        $transactions = [];
        $i = 0;
        $j = 0;

        while ($i < count($debtors) && $j < count($creditors)) {
            $transferAmount = bccomp($debtors[$i]['amount'], $creditors[$j]['amount'], 2) < 0
                ? $debtors[$i]['amount']
                : $creditors[$j]['amount'];

            $transactions[] = [
                'from_user_id' => $debtors[$i]['user_id'],
                'to_user_id' => $creditors[$j]['user_id'],
                'amount' => $transferAmount,
            ];

            $debtors[$i]['amount'] = bcsub($debtors[$i]['amount'], $transferAmount, 2);
            $creditors[$j]['amount'] = bcsub($creditors[$j]['amount'], $transferAmount, 2);

            if (bccomp($debtors[$i]['amount'], '0.00', 2) === 0) {
                $i++;
            }

            if (bccomp($creditors[$j]['amount'], '0.00', 2) === 0) {
                $j++;
            }
        }

        return $transactions;
    }
}
