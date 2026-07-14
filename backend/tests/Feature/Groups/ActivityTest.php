<?php

use App\Models\Expense;
use App\Models\Settlement;
use App\Models\User;

it('lists expense versions and settlements as a combined, newest-first activity feed', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => '20.00', 'currency' => 'EUR',
        'paid_by' => $alice->id, 'created_by' => $alice->id,
    ]);
    $v1->shares()->createMany([
        ['user_id' => $alice->id, 'share_amount' => '10.00'],
        ['user_id' => $bob->id, 'share_amount' => '10.00'],
    ]);
    $expense->update(['current_version_id' => $v1->id]);

    Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $bob->id, 'to_user_id' => $alice->id,
        'amount' => '10.00', 'currency' => 'EUR', 'created_by' => $bob->id,
    ]);

    $response = $this->actingAs($alice)->getJson("/api/groups/{$group->id}/activity");

    $response->assertOk()->assertJsonCount(2);
    expect(collect($response->json())->pluck('type')->all())->toEqualCanonicalizing([
        'expense_version', 'settlement',
    ]);
});

it('records a deletion in the activity feed without losing prior edit history', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => '10.00', 'currency' => 'EUR',
        'paid_by' => $alice->id, 'created_by' => $alice->id,
    ]);
    $v1->shares()->create(['user_id' => $alice->id, 'share_amount' => '10.00']);
    $expense->update(['current_version_id' => $v1->id]);

    $expense->delete();

    $response = $this->actingAs($alice)->getJson("/api/groups/{$group->id}/activity");

    $response->assertOk()->assertJsonCount(2);
    expect(collect($response->json())->pluck('type')->all())->toEqualCanonicalizing([
        'expense_version', 'expense_deleted',
    ]);
});

it('forbids a non-member from viewing group activity', function () {
    $outsider = User::factory()->create();
    $group = groupWithMembers(User::factory()->create());

    $this->actingAs($outsider)->getJson("/api/groups/{$group->id}/activity")->assertForbidden();
});
