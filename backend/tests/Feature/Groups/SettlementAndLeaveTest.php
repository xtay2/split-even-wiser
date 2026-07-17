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

it('is idempotent when the same client_uuid is replayed, for offline sync retries', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $clientUuid = (string) Illuminate\Support\Str::uuid();

    $payload = ['to_user_id' => $bob->id, 'amount' => 10, 'currency' => 'EUR', 'client_uuid' => $clientUuid];

    $first = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/settlements", $payload);
    $first->assertCreated();

    $retry = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/settlements", $payload);
    $retry->assertOk()->assertJsonPath('id', $first->json('id'));

    expect(Settlement::count())->toBe(1);
});

it('records a partial settlement with a date, as its own ledger entry', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/settlements", [
        'to_user_id' => $bob->id,
        'amount' => 4.5,
        'currency' => 'EUR',
        'date' => '2026-07-16',
    ]);

    $response->assertCreated()
        ->assertJsonPath('date', '2026-07-16')
        ->assertJsonPath('amount', '4.50');
});

it('defaults date when a settlement is recorded without them', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/settlements", [
        'to_user_id' => $bob->id,
        'amount' => 10,
        'currency' => 'EUR',
    ]);

    expect($response->json('date'))->not->toBeNull();
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

it('shows a single settlement', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $settlement = Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $alice->id, 'to_user_id' => $bob->id,
        'amount' => 10, 'currency' => 'EUR', 'date' => '2026-07-16', 'created_by' => $alice->id,
    ]);

    $this->actingAs($alice)->getJson("/api/groups/{$group->id}/settlements/{$settlement->id}")
        ->assertOk()
        ->assertJsonPath('amount', '10.00');
});

it('lets any active member update a settlement, correcting the amount and date', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $settlement = Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $alice->id, 'to_user_id' => $bob->id,
        'amount' => 10, 'currency' => 'EUR', 'date' => '2026-07-16', 'created_by' => $alice->id,
    ]);

    $response = $this->actingAs($bob)->patchJson("/api/groups/{$group->id}/settlements/{$settlement->id}", [
        'to_user_id' => $bob->id,
        'amount' => 12.5,
        'currency' => 'usd',
        'date' => '2026-07-17',
    ]);

    $response->assertOk()
        ->assertJsonPath('amount', '12.50')
        ->assertJsonPath('currency', 'USD')
        ->assertJsonPath('date', '2026-07-17')
        ->assertJsonPath('from_user_id', $alice->id);
});

it('rejects updating a settlement to settle with the original payer', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $settlement = Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $alice->id, 'to_user_id' => $bob->id,
        'amount' => 10, 'currency' => 'EUR', 'date' => '2026-07-16', 'created_by' => $alice->id,
    ]);

    $this->actingAs($alice)->patchJson("/api/groups/{$group->id}/settlements/{$settlement->id}", [
        'to_user_id' => $alice->id,
        'amount' => 10,
        'currency' => 'EUR',
    ])->assertUnprocessable();
});

it('soft-deletes a settlement, excluding it from the index but keeping the record', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $settlement = Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $alice->id, 'to_user_id' => $bob->id,
        'amount' => 10, 'currency' => 'EUR', 'date' => '2026-07-16', 'created_by' => $alice->id,
    ]);

    $this->actingAs($bob)->deleteJson("/api/groups/{$group->id}/settlements/{$settlement->id}")
        ->assertNoContent();

    $this->actingAs($alice)->getJson("/api/groups/{$group->id}/settlements")->assertOk()->assertJsonCount(0);
    expect(Settlement::withTrashed()->find($settlement->id))->not->toBeNull();
});

it('forbids a non-member from updating or deleting a settlement', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $outsider = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $settlement = Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $alice->id, 'to_user_id' => $bob->id,
        'amount' => 10, 'currency' => 'EUR', 'date' => '2026-07-16', 'created_by' => $alice->id,
    ]);

    $this->actingAs($outsider)->patchJson("/api/groups/{$group->id}/settlements/{$settlement->id}", [
        'to_user_id' => $bob->id, 'amount' => 10, 'currency' => 'EUR',
    ])->assertForbidden();

    $this->actingAs($outsider)->deleteJson("/api/groups/{$group->id}/settlements/{$settlement->id}")
        ->assertForbidden();
});

it('blocks leaving a group with an outstanding balance', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $alice->id]);
    $v1 = $expense->versions()->create([
        'version_no' => 1, 'title' => 'Dinner', 'amount' => 20, 'currency' => 'EUR', 'date' => '2026-07-10',
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
        'version_no' => 1, 'title' => 'Dinner', 'amount' => 20, 'currency' => 'EUR', 'date' => '2026-07-10',
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
