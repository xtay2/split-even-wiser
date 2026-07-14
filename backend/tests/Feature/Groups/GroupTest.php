<?php

use App\Models\Group;
use App\Models\User;

it('creates a group and auto-joins the creator as a member', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/groups', [
        'name' => 'Roadtrip',
        'description' => 'Summer 2026',
    ]);

    $response->assertCreated()->assertJsonPath('name', 'Roadtrip');
    $group = Group::first();
    expect($group->groupMembers()->where('user_id', $user->id)->whereNull('left_at')->exists())->toBeTrue();
});

it('lists only groups the user is an active member of', function () {
    $user = User::factory()->create();
    $myGroup = Group::factory()->create();
    $myGroup->groupMembers()->create(['user_id' => $user->id, 'joined_at' => now()]);
    Group::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/groups');

    $response->assertOk()->assertJsonCount(1);
});

it('allows a member to view group details', function () {
    $user = User::factory()->create();
    $group = Group::factory()->create();
    $group->groupMembers()->create(['user_id' => $user->id, 'joined_at' => now()]);

    $this->actingAs($user)->getJson("/api/groups/{$group->id}")->assertOk();
});

it('forbids a non-member from viewing group details', function () {
    $user = User::factory()->create();
    $group = Group::factory()->create();

    $this->actingAs($user)->getJson("/api/groups/{$group->id}")->assertForbidden();
});

it('lets an existing member add another user by username', function () {
    $member = User::factory()->create();
    $newcomer = User::factory()->create(['username' => 'newcomer']);
    $group = Group::factory()->create();
    $group->groupMembers()->create(['user_id' => $member->id, 'joined_at' => now()]);

    $response = $this->actingAs($member)->postJson("/api/groups/{$group->id}/members", [
        'identifier' => 'newcomer',
    ]);

    $response->assertOk();
    expect($group->groupMembers()->where('user_id', $newcomer->id)->whereNull('left_at')->exists())->toBeTrue();
});

it('forbids a non-member from adding people to a group', function () {
    $outsider = User::factory()->create();
    $target = User::factory()->create(['username' => 'target']);
    $group = Group::factory()->create();

    $this->actingAs($outsider)->postJson("/api/groups/{$group->id}/members", ['identifier' => 'target'])
        ->assertForbidden();
});

it('rejects adding someone who is already a member', function () {
    $member = User::factory()->create();
    $other = User::factory()->create(['username' => 'other']);
    $group = Group::factory()->create();
    $group->groupMembers()->create(['user_id' => $member->id, 'joined_at' => now()]);
    $group->groupMembers()->create(['user_id' => $other->id, 'joined_at' => now()]);

    $this->actingAs($member)->postJson("/api/groups/{$group->id}/members", ['identifier' => 'other'])
        ->assertUnprocessable();
});

it('lets a member update the group name and description', function () {
    $member = User::factory()->create();
    $group = Group::factory()->create();
    $group->groupMembers()->create(['user_id' => $member->id, 'joined_at' => now()]);

    $this->actingAs($member)->patchJson("/api/groups/{$group->id}", ['name' => 'New Name'])
        ->assertOk()->assertJsonPath('name', 'New Name');
});
