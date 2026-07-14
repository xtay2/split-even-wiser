<?php

use App\Models\Expense;
use App\Models\Group;
use App\Models\Settlement;
use App\Models\User;

it('records a settlement made by the authenticated user', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/settlements", [
        'to_user_id' => $bob->id,
        'amount' => 10,
        'currency' => 'EUR',
    ]);

    $response->assertCreated()
        ->assertJsonPath('from_user_id', $alice->id)
        ->assertJsonPath('to_user_id', $bob->id);
});

it('rejects settling a debt with yourself', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/settlements", [
        'to_user_id' => $alice->id,
        'amount' => 10,
        'currency' => 'EUR',
    ])->assertUnprocessable();
});

it('blocks leaving a group with an outstanding balance', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => 20, 'currency' => 'EUR',
        'paid_by' => $alice->id, 'created_by' => $alice->id,
    ]);
    $v1->shares()->createMany([
        ['user_id' => $alice->id, 'share_amount' => 10],
        ['user_id' => $bob->id, 'share_amount' => 10],
    ]);
    $expense->update(['current_version_id' => $v1->id]);

    $this->actingAs($bob)->deleteJson("/api/groups/{$group->id}/members/{$bob->id}")
        ->assertStatus(409);
});

it('allows leaving once the member is quitt', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => 20, 'currency' => 'EUR',
        'paid_by' => $alice->id, 'created_by' => $alice->id,
    ]);
    $v1->shares()->createMany([
        ['user_id' => $alice->id, 'share_amount' => 10],
        ['user_id' => $bob->id, 'share_amount' => 10],
    ]);
    $expense->update(['current_version_id' => $v1->id]);

    Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $bob->id, 'to_user_id' => $alice->id,
        'amount' => 10, 'currency' => 'EUR', 'created_by' => $bob->id,
    ]);

    $this->actingAs($bob)->deleteJson("/api/groups/{$group->id}/members/{$bob->id}")
        ->assertNoContent();

    expect($group->groupMembers()->where('user_id', $bob->id)->whereNull('left_at')->exists())->toBeFalse();
});

it('prevents a member from removing someone else from the group', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $this->actingAs($alice)->deleteJson("/api/groups/{$group->id}/members/{$bob->id}")
        ->assertForbidden();
});

it('lets a member with no expenses leave immediately', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $this->actingAs($bob)->deleteJson("/api/groups/{$group->id}/members/{$bob->id}")
        ->assertNoContent();
});
