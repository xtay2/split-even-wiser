<?php

use App\Models\Expense;
use App\Models\User;

it('creates an expense split evenly and records it as version 1', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Dinner',
        'amount' => 20,
        'currency' => 'eur',
        'shares' => [
            ['user_id' => $alice->id, 'amount' => 10],
            ['user_id' => $bob->id, 'amount' => 10],
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('current_version.title', 'Dinner')
        ->assertJsonPath('current_version.currency', 'EUR')
        ->assertJsonPath('current_version.version_no', 1)
        ->assertJsonPath('current_version.paid_by', $alice->id);

    $expense = Expense::first();
    expect($expense->versions()->count())->toBe(1);
    expect($expense->currentVersion->shares()->count())->toBe(2);
});

it('rejects an expense whose shares do not sum to the total amount', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Dinner',
        'amount' => 20,
        'currency' => 'EUR',
        'shares' => [
            ['user_id' => $alice->id, 'amount' => 10],
            ['user_id' => $bob->id, 'amount' => 5],
        ],
    ])->assertUnprocessable()->assertJsonValidationErrors('shares');
});

it('rejects a share for a user who is not an active group member', function () {
    $alice = User::factory()->create();
    $outsider = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Dinner',
        'amount' => 10,
        'currency' => 'EUR',
        'shares' => [['user_id' => $outsider->id, 'amount' => 10]],
    ])->assertUnprocessable()->assertJsonValidationErrors('shares.0.user_id');
});

it('allows specifying a different payer than the creator', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Dinner',
        'amount' => 20,
        'currency' => 'EUR',
        'paid_by' => $bob->id,
        'shares' => [
            ['user_id' => $alice->id, 'amount' => 10],
            ['user_id' => $bob->id, 'amount' => 10],
        ],
    ]);

    $response->assertCreated()->assertJsonPath('current_version.paid_by', $bob->id);
});

it('creates a new version on update without discarding the old one', function () {
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

    $response = $this->actingAs($bob)->patchJson("/api/groups/{$group->id}/expenses/{$expense->id}", [
        'title' => 'Fancy Dinner',
        'amount' => 30,
        'currency' => 'EUR',
        'shares' => [
            ['user_id' => $alice->id, 'amount' => 15],
            ['user_id' => $bob->id, 'amount' => 15],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('current_version.title', 'Fancy Dinner')
        ->assertJsonPath('current_version.version_no', 2)
        ->assertJsonPath('current_version.created_by', $bob->id)
        ->assertJsonPath('current_version.paid_by', $alice->id);

    expect($expense->versions()->count())->toBe(2);
    expect($expense->versions()->where('version_no', 1)->first()->title)->toBe('Dinner');
});

it('exposes full version history for an expense', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => 10, 'currency' => 'EUR',
        'paid_by' => $alice->id, 'created_by' => $alice->id,
    ]);
    $v1->shares()->create(['user_id' => $alice->id, 'share_amount' => 10]);
    $expense->update(['current_version_id' => $v1->id]);

    $response = $this->actingAs($alice)->getJson("/api/groups/{$group->id}/expenses/{$expense->id}/history");

    $response->assertOk()->assertJsonCount(1);
});

it('excludes deleted expenses from the index but soft-deletes rather than hard-deleting', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => 10, 'currency' => 'EUR',
        'paid_by' => $alice->id, 'created_by' => $alice->id,
    ]);
    $v1->shares()->create(['user_id' => $alice->id, 'share_amount' => 10]);
    $expense->update(['current_version_id' => $v1->id]);

    $this->actingAs($alice)->deleteJson("/api/groups/{$group->id}/expenses/{$expense->id}")->assertNoContent();

    $this->actingAs($alice)->getJson("/api/groups/{$group->id}/expenses")->assertOk()->assertJsonCount(0);
    expect(Expense::withTrashed()->find($expense->id))->not->toBeNull();
});

it('forbids a non-member from creating an expense in a group', function () {
    $outsider = User::factory()->create();
    $group = groupWithMembers(User::factory()->create());

    $this->actingAs($outsider)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Dinner', 'amount' => 10, 'currency' => 'EUR',
        'shares' => [['user_id' => $outsider->id, 'amount' => 10]],
    ])->assertForbidden();
});
