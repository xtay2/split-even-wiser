<?php

namespace App\Policies;

use App\Models\Group;
use App\Models\User;

class GroupPolicy
{
    public function view(User $user, Group $group): bool
    {
        return $this->isActiveMember($user, $group);
    }

    public function update(User $user, Group $group): bool
    {
        return $this->isActiveMember($user, $group);
    }

    public function addMember(User $user, Group $group): bool
    {
        return $this->isActiveMember($user, $group);
    }

    private function isActiveMember(User $user, Group $group): bool
    {
        return $group->groupMembers()->where('user_id', $user->id)->whereNull('left_at')->exists();
    }
}
