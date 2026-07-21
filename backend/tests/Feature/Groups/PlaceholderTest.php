<?php

use App\Mail\GroupInviteMail;
use App\Models\Expense;
use App\Models\ExpenseVersion;
use App\Models\ExpenseVersionShare;
use App\Models\Friendship;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\LoginToken;
use App\Models\Settlement;
use App\Models\User;
use App\Notifications\FriendRequestReceived;
use App\Services\GroupBalanceCalculator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

it('creates a name-only placeholder as an active member with no email and no mail sent', function () {
    Mail::fake();
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", [
        'name' => 'Bob Builder',
    ]);

    $response->assertCreated();
    $placeholder = User::where('display_name', 'Bob Builder')->first();
    expect($placeholder)->not->toBeNull();
    expect($placeholder->is_placeholder)->toBeTrue();
    expect($placeholder->email)->toBeNull();
    expect($placeholder->username)->toMatch('/^[a-zA-Z0-9_.]{3,30}$/');
    expect($group->groupMembers()->where('user_id', $placeholder->id)->whereNull('left_at')->exists())->toBeTrue();
    Mail::assertNothingQueued();
});

it('derives the display name from the email local-part when only an email is given', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", [
        'email' => 'carol@example.com',
    ])->assertCreated();

    $placeholder = User::where('email', 'carol@example.com')->first();
    expect($placeholder->display_name)->toBe('carol');
});

it('rejects an email that already belongs to an existing user', function () {
    $alice = User::factory()->create();
    User::factory()->create(['email' => 'taken@example.com']);
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", [
        'email' => 'taken@example.com',
    ])->assertUnprocessable()->assertJsonValidationErrors('email');
});

it('requires at least a name or an email', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", [])
        ->assertUnprocessable();
});

it('forbids a non-member from creating a placeholder', function () {
    $outsider = User::factory()->create();
    $group = Group::factory()->create();

    $this->actingAs($outsider)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])
        ->assertForbidden();
});

it('disambiguates usernames when two placeholders share a slug across different groups', function () {
    $alice = User::factory()->create();
    $groupA = groupWithMembers($alice);
    $groupB = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$groupA->id}/placeholders", ['name' => 'Bob'])->assertCreated();
    $this->actingAs($alice)->postJson("/api/groups/{$groupB->id}/placeholders", ['name' => 'Bob'])->assertCreated();

    $usernames = User::where('display_name', 'Bob')->pluck('username');
    expect($usernames->count())->toBe(2);
    expect($usernames->unique()->count())->toBe(2);
    $usernames->each(fn ($username) => expect($username)->toMatch('/^[a-zA-Z0-9_.]{3,30}$/'));
});

it('rejects a placeholder name that duplicates another placeholder already in the group', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Bob'])->assertCreated();

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'bob '])
        ->assertUnprocessable()->assertJsonValidationErrors('name');

    expect(User::where('display_name', 'Bob')->count())->toBe(1);
});

it('allows the same placeholder name in a different group', function () {
    $alice = User::factory()->create();
    $groupA = groupWithMembers($alice);
    $groupB = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$groupA->id}/placeholders", ['name' => 'Bob'])->assertCreated();
    $this->actingAs($alice)->postJson("/api/groups/{$groupB->id}/placeholders", ['name' => 'Bob'])->assertCreated();

    expect(User::where('display_name', 'Bob')->count())->toBe(2);
});

it('allows reusing a placeholder name once the original placeholder has left the group', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Bob'])->assertCreated();
    $original = User::where('display_name', 'Bob')->first();
    $group->activeMembership($original)->update(['left_at' => now()]);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Bob'])->assertCreated();

    expect(User::where('display_name', 'Bob')->count())->toBe(2);
});

it('queues an invite email and creates an accepted friendship without notifying', function () {
    Mail::fake();
    Notification::fake();
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", [
        'email' => 'dave@example.com',
    ])->assertCreated();

    $placeholder = User::where('email', 'dave@example.com')->first();

    Mail::assertQueued(GroupInviteMail::class, fn ($mail) => $mail->email === 'dave@example.com');
    expect(Friendship::where([
        'requester_id' => $alice->id,
        'addressee_id' => $placeholder->id,
        'status' => 'accepted',
    ])->exists())->toBeTrue();
    Notification::assertNothingSent();
});

it('issues an invite login token that is valid for a week rather than the usual 15 minutes', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", [
        'email' => 'week.long@example.com',
    ])->assertCreated();

    $token = LoginToken::where('email', 'week.long@example.com')->first();
    expect($token->expires_at)->toBeGreaterThan(now()->addDays(6)->addHours(23));
    expect($token->expires_at)->toBeLessThanOrEqual(now()->addDays(7)->addMinute());
});

it('logs into a placeholder directly via the magic link and claims it in place', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['email' => 'eve@example.com'])
        ->assertCreated();
    $placeholder = User::where('email', 'eve@example.com')->first();

    $token = LoginToken::issueFor('eve@example.com');
    $response = $this->postJson('/api/auth/verify', ['email' => 'eve@example.com', 'token' => $token]);

    $response->assertOk()->assertJsonPath('user.id', $placeholder->id);
    $placeholder->refresh();
    expect($placeholder->is_placeholder)->toBeFalse();
    expect($placeholder->claimed_at)->not->toBeNull();
    expect(User::count())->toBe(2);
});

it('forbids claiming for a non-member of the group', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertForbidden();
});

it('rejects claiming a non-placeholder user', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$bob->id}/claim")
        ->assertNotFound();
});

it('rejects claiming yourself', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$alice->id}/claim")
        ->assertUnprocessable();
});

it('merges a placeholder’s expenses, including soft-deleted ones, into the claimant', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();

    $active = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Dinner',
        'amount' => 20,
        'currency' => 'EUR',
        'date' => '2026-07-10',
        'paid_by' => $placeholder->id,
        'shares' => [
            ['user_id' => $alice->id, 'amount' => 10],
            ['user_id' => $placeholder->id, 'amount' => 10],
        ],
    ])->json();

    $deletedExpense = Expense::create([
        'group_id' => $group->id,
        'created_by' => $placeholder->id,
        'client_uuid' => null,
    ]);
    $deletedExpense->delete();

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    expect(ExpenseVersion::where('paid_by', $placeholder->id)->count())->toBe(0);
    expect(Expense::withTrashed()->where('created_by', $placeholder->id)->count())->toBe(0);
    expect(Expense::withTrashed()->where('created_by', $alice->id)->count())->toBeGreaterThanOrEqual(2);
});

it('combines conflicting expense_version_shares with bcadd', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();

    $expense = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Groceries',
        'amount' => 30,
        'currency' => 'EUR',
        'date' => '2026-07-10',
        'shares' => [
            ['user_id' => $alice->id, 'amount' => 15],
            ['user_id' => $placeholder->id, 'amount' => 15],
        ],
    ])->json();

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    $version = ExpenseVersion::where('expense_id', $expense['id'])->first();
    expect(ExpenseVersionShare::where('expense_version_id', $version->id)->count())->toBe(1);
    expect((float) ExpenseVersionShare::where('expense_version_id', $version->id)->first()->share_amount)->toBe(30.0);
});

it('retires a settlement that becomes self-referential after merging', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();

    $settlement = Settlement::create([
        'group_id' => $group->id,
        'from_user_id' => $alice->id,
        'to_user_id' => $placeholder->id,
        'amount' => 5,
        'currency' => 'EUR',
        'date' => '2026-07-10',
        'created_by' => $alice->id,
    ]);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    expect(Settlement::withTrashed()->find($settlement->id)->deleted_at)->not->toBeNull();
});

it('collapses friendships that would become self-referential or duplicate after merging', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['email' => 'ghost@example.com'])
        ->assertCreated();
    $placeholder = User::where('email', 'ghost@example.com')->first();
    // Auto-created accepted friendship alice<->placeholder already exists at this point.

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    expect(Friendship::where('requester_id', $placeholder->id)->orWhere('addressee_id', $placeholder->id)->count())
        ->toBe(0);
    expect(Friendship::where('requester_id', $alice->id)->where('addressee_id', $alice->id)->exists())->toBeFalse();
});

it('reassigns group memberships across multiple groups on claim', function () {
    $alice = User::factory()->create();
    $groupA = groupWithMembers($alice);
    $groupB = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$groupA->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();
    $groupB->groupMembers()->create(['user_id' => $placeholder->id, 'joined_at' => now()]);

    $this->actingAs($alice)->postJson("/api/groups/{$groupA->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    // Alice was already active in both groups, so both placeholder rows should be closed out,
    // not reassigned onto a duplicate active membership for Alice.
    expect(GroupMember::where('user_id', $placeholder->id)->exists())->toBeFalse();
    expect($groupA->groupMembers()->where('user_id', $alice->id)->whereNull('left_at')->count())->toBe(1);
    expect($groupB->groupMembers()->where('user_id', $alice->id)->whereNull('left_at')->count())->toBe(1);
});

it('deletes the placeholder row after a successful claim with no orphaned references', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();
    $placeholderId = $placeholder->id;

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholderId}/claim")
        ->assertOk();

    expect(User::find($placeholderId))->toBeNull();
    expect(GroupMember::where('user_id', $placeholderId)->count())->toBe(0);
    expect(ExpenseVersionShare::where('user_id', $placeholderId)->count())->toBe(0);
});

it('preserves the group balance total across a merge that has no self-settlement', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/expenses", [
        'title' => 'Trip',
        'amount' => 30,
        'currency' => 'EUR',
        'date' => '2026-07-10',
        'paid_by' => $placeholder->id,
        'shares' => [
            ['user_id' => $bob->id, 'amount' => 15],
            ['user_id' => $placeholder->id, 'amount' => 15],
        ],
    ])->assertCreated();

    $calculator = app(GroupBalanceCalculator::class);
    $before = $calculator->netBalances($group->fresh());

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    $after = $calculator->netBalances($group->fresh());

    expect($after[$bob->id]['EUR'])->toBe($before[$bob->id]['EUR']);
    expect($after[$alice->id]['EUR'] ?? '0.00')->toBe($before[$placeholder->id]['EUR']);
});

it('records a claim in the group activity feed', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders", ['name' => 'Ghost Rider'])
        ->assertCreated();
    $placeholder = User::where('display_name', 'Ghost Rider')->first();

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    $response = $this->actingAs($alice)->getJson("/api/groups/{$group->id}/activity");

    $response->assertOk()->assertJsonCount(1);
    $entry = $response->json()[0];
    expect($entry['type'])->toBe('placeholder_claimed');
    expect($entry['claimant']['id'])->toBe($alice->id);
    expect($entry['placeholder_display_name'])->toBe('Ghost Rider');
    expect($entry['placeholder_username'])->toBe($placeholder->username);
});

it('records a claim in the activity feed of every group the placeholder belonged to', function () {
    $alice = User::factory()->create();
    $groupA = groupWithMembers($alice);
    $groupB = groupWithMembers($alice);
    $this->actingAs($alice)->postJson("/api/groups/{$groupA->id}/placeholders", ['name' => 'Ghost'])->assertCreated();
    $placeholder = User::where('display_name', 'Ghost')->first();
    $groupB->groupMembers()->create(['user_id' => $placeholder->id, 'joined_at' => now()]);

    $this->actingAs($alice)->postJson("/api/groups/{$groupA->id}/placeholders/{$placeholder->id}/claim")
        ->assertOk();

    foreach ([$groupA, $groupB] as $group) {
        $response = $this->actingAs($alice)->getJson("/api/groups/{$group->id}/activity");
        $response->assertOk()->assertJsonCount(1);
        expect($response->json()[0]['type'])->toBe('placeholder_claimed');
    }
});
