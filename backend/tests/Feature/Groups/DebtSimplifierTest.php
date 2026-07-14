<?php

use App\Models\Expense;
use App\Models\Group;
use App\Models\Settlement;
use App\Models\User;
use App\Services\DebtSimplifier;

/**
 * Creates a single-version expense paid by $payer, where each key in $shares (user_id)
 * owes the paired amount back to the payer.
 */
function makeExpense(Group $group, User $payer, string $title, string $amount, string $currency, array $shares): Expense
{
    $expense = Expense::create(['group_id' => $group->id, 'created_by' => $payer->id]);

    $version = $expense->versions()->create([
        'version_no' => 1,
        'title' => $title,
        'amount' => $amount,
        'currency' => $currency,
        'paid_by' => $payer->id,
        'created_by' => $payer->id,
    ]);

    $version->shares()->createMany(
        collect($shares)->map(fn ($amount, $userId) => ['user_id' => $userId, 'share_amount' => $amount])->values(),
    );

    $expense->update(['current_version_id' => $version->id]);

    return $expense;
}

it('collapses a transitive chain: A owes B, B owes C, into A owes C', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $c = User::factory()->create();
    $group = groupWithMembers($a, $b, $c);

    makeExpense($group, $b, 'A owes B', '5.00', 'EUR', [$a->id => '5.00']);
    makeExpense($group, $c, 'B owes C', '5.00', 'EUR', [$b->id => '5.00']);

    $transactions = app(DebtSimplifier::class)->simplify($group);

    expect($transactions)->toHaveCount(1);
    expect($transactions[0])->toMatchArray([
        'from_user_id' => $a->id,
        'to_user_id' => $c->id,
        'amount' => '5.00',
        'currency' => 'EUR',
    ]);
});

it('keeps different currencies simplified independently, never netting across them', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $group = groupWithMembers($a, $b);

    makeExpense($group, $b, 'Rent', '10.00', 'EUR', [$a->id => '10.00']);
    makeExpense($group, $a, 'Taxi', '5.00', 'USD', [$b->id => '5.00']);

    $transactions = collect(app(DebtSimplifier::class)->simplify($group));

    expect($transactions)->toHaveCount(2);
    expect($transactions->firstWhere('currency', 'EUR'))->toMatchArray([
        'from_user_id' => $a->id, 'to_user_id' => $b->id, 'amount' => '10.00',
    ]);
    expect($transactions->firstWhere('currency', 'USD'))->toMatchArray([
        'from_user_id' => $b->id, 'to_user_id' => $a->id, 'amount' => '5.00',
    ]);
});

it('reduces the simplified debt after a partial settlement', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $group = groupWithMembers($a, $b);

    makeExpense($group, $b, 'Dinner', '10.00', 'EUR', [$a->id => '10.00']);

    Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $a->id, 'to_user_id' => $b->id,
        'amount' => '4.00', 'currency' => 'EUR', 'created_by' => $a->id,
    ]);

    $transactions = app(DebtSimplifier::class)->simplify($group);

    expect($transactions)->toHaveCount(1);
    expect($transactions[0])->toMatchArray([
        'from_user_id' => $a->id, 'to_user_id' => $b->id, 'amount' => '6.00', 'currency' => 'EUR',
    ]);
});

it('produces no transactions once fully settled', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $group = groupWithMembers($a, $b);

    makeExpense($group, $b, 'Dinner', '10.00', 'EUR', [$a->id => '10.00']);

    Settlement::create([
        'group_id' => $group->id, 'from_user_id' => $a->id, 'to_user_id' => $b->id,
        'amount' => '10.00', 'currency' => 'EUR', 'created_by' => $a->id,
    ]);

    expect(app(DebtSimplifier::class)->simplify($group))->toBe([]);
});

it('exposes the simplified balances over the API', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $group = groupWithMembers($a, $b);

    makeExpense($group, $b, 'Dinner', '10.00', 'EUR', [$a->id => '10.00']);

    $response = $this->actingAs($a)->getJson("/api/groups/{$group->id}/balances");

    $response->assertOk()->assertJsonCount(1)
        ->assertJsonPath('0.from_user_id', $a->id)
        ->assertJsonPath('0.to_user_id', $b->id)
        ->assertJsonPath('0.amount', '10.00');
});

it('forbids a non-member from viewing balances', function () {
    $outsider = User::factory()->create();
    $group = groupWithMembers(User::factory()->create());

    $this->actingAs($outsider)->getJson("/api/groups/{$group->id}/balances")->assertForbidden();
});
