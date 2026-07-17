<?php

namespace App\Policies;

use App\Models\Settlement;
use App\Models\User;

class SettlementPolicy
{
    public function view(User $user, Settlement $settlement): bool
    {
        return $this->isActiveMember($user, $settlement);
    }

    public function update(User $user, Settlement $settlement): bool
    {
        return $this->isActiveMember($user, $settlement);
    }

    public function delete(User $user, Settlement $settlement): bool
    {
        return $this->isActiveMember($user, $settlement);
    }

    private function isActiveMember(User $user, Settlement $settlement): bool
    {
        return $settlement->group->groupMembers()->where('user_id', $user->id)->whereNull('left_at')->exists();
    }
}
