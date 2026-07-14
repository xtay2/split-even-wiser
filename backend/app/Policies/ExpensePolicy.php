<?php

namespace App\Policies;

use App\Models\Expense;
use App\Models\User;

class ExpensePolicy
{
    public function view(User $user, Expense $expense): bool
    {
        return $this->isActiveMember($user, $expense);
    }

    public function update(User $user, Expense $expense): bool
    {
        return $this->isActiveMember($user, $expense);
    }

    public function delete(User $user, Expense $expense): bool
    {
        return $this->isActiveMember($user, $expense);
    }

    private function isActiveMember(User $user, Expense $expense): bool
    {
        return $expense->group->groupMembers()->where('user_id', $user->id)->whereNull('left_at')->exists();
    }
}
