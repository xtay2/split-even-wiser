<?php

use App\Models\Group;
use App\Models\GroupInvite;
use App\Models\User;

it('creates a never-expiring invite link', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $response = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ]);

    $response->assertCreated();
    expect($response->json('url'))->toContain('/invite/');
    expect($response->json('expires_at'))->toBeNull();
    expect(GroupInvite::where('group_id', $group->id)->count())->toBe(1);
    expect(GroupInvite::where('group_id', $group->id)->first()->expires_at)->toBeNull();
});

it('creates an invite link with each supported expiration option', function (string $option) {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => $option,
    ])->assertCreated();

    expect(GroupInvite::where('group_id', $group->id)->first())->not->toBeNull();
})->with(['15_minutes', '1_day', '1_week', '3_months', '1_year']);

it('rejects an unknown expiration option', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'not-a-real-option',
    ])->assertUnprocessable()->assertJsonValidationErrors('expires_in');
});

it('forbids a non-member from creating an invite link', function () {
    $outsider = User::factory()->create();
    $group = Group::factory()->create();

    $this->actingAs($outsider)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->assertForbidden();
});

it('replaces the previous invite link when a new one is generated', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $first = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->json();
    $firstToken = str($first['url'])->afterLast('/invite/')->toString();

    $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => '1_week',
    ])->assertCreated();

    expect(GroupInvite::where('group_id', $group->id)->count())->toBe(1);
    $this->getJson("/api/invite-links/{$firstToken}")->assertNotFound();
});

it('returns a public preview of the group for a valid invite token', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $response = $this->getJson("/api/invite-links/{$token}");

    $response->assertOk()->assertJsonPath('group.id', $group->id)->assertJsonPath('group.name', $group->name);
});

it('404s the public preview for an unknown token', function () {
    $this->getJson('/api/invite-links/not-a-real-token')->assertNotFound();
});

it('404s the public preview for an expired token', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => '15_minutes',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $this->travel(16)->minutes();

    $this->getJson("/api/invite-links/{$token}")->assertNotFound();
});

it('adds an authenticated user to the group when accepting a valid invite', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $response = $this->actingAs($bob)->postJson("/api/invite-links/{$token}/accept");

    $response->assertOk();
    expect($group->groupMembers()->where('user_id', $bob->id)->whereNull('left_at')->exists())->toBeTrue();
});

it('is idempotent when an already-active member accepts the invite again', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $this->actingAs($alice)->postJson("/api/invite-links/{$token}/accept")->assertOk();

    expect($group->groupMembers()->where('user_id', $alice->id)->whereNull('left_at')->count())->toBe(1);
});

it('reactivates a membership for a user who previously left the group', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice, $bob);
    $group->activeMembership($bob)->update(['left_at' => now()]);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $this->actingAs($bob)->postJson("/api/invite-links/{$token}/accept")->assertOk();

    expect($group->groupMembers()->where('user_id', $bob->id)->whereNull('left_at')->count())->toBe(1);
});

it('404s accepting an expired invite token', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => '15_minutes',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $this->travel(16)->minutes();

    $this->actingAs($bob)->postJson("/api/invite-links/{$token}/accept")->assertNotFound();
});

it('requires authentication to accept an invite', function () {
    $alice = User::factory()->create();
    $group = groupWithMembers($alice);
    ['token' => $token] = GroupInvite::issueFor($group, $alice, null);

    // No actingAs anywhere in this test - it must stay a genuine guest request.
    $this->postJson("/api/invite-links/{$token}/accept")->assertUnauthorized();
});

it('does not duplicate the membership when accept is raced by a duplicate request', function () {
    // Simulates two near-simultaneous accept requests for the same invite (e.g. React
    // StrictMode double-invoking an effect): the second must not create a second active row.
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $group = groupWithMembers($alice);

    $created = $this->actingAs($alice)->postJson("/api/groups/{$group->id}/invite-link", [
        'expires_in' => 'never',
    ])->json();
    $token = str($created['url'])->afterLast('/invite/')->toString();

    $this->actingAs($bob)->postJson("/api/invite-links/{$token}/accept")->assertOk();
    // The membership already exists by the time this second request's own lookup runs, so this
    // covers the "found it" branch; the true race (both requests missing it) is covered by the
    // unique index itself, asserted directly below.
    $this->actingAs($bob)->postJson("/api/invite-links/{$token}/accept")->assertOk();

    expect($group->groupMembers()->where('user_id', $bob->id)->whereNull('left_at')->count())->toBe(1);

    // Directly prove the DB enforces uniqueness even if two requests both raced past the
    // "existing membership" check before either had committed its insert.
    expect(fn () => \Illuminate\Support\Facades\DB::table('group_members')->insert([
        'group_id' => $group->id,
        'user_id' => $bob->id,
        'joined_at' => now(),
        'left_at' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(\Illuminate\Database\QueryException::class);
});
