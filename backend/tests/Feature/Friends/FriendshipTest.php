<?php

use App\Models\Friendship;
use App\Models\User;
use App\Notifications\FriendRequestReceived;
use Illuminate\Support\Facades\Notification;

it('sends a friend request by username and notifies the addressee', function () {
    Notification::fake();
    $alice = User::factory()->create(['username' => 'alice']);
    $bob = User::factory()->create(['username' => 'bob']);

    $response = $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob']);

    $response->assertCreated()->assertJsonPath('status', 'pending');
    expect(Friendship::where(['requester_id' => $alice->id, 'addressee_id' => $bob->id])->exists())->toBeTrue();
    Notification::assertSentTo($bob, FriendRequestReceived::class);
});

it('sends a friend request by email', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create(['email' => 'bob@example.com']);

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob@example.com'])
        ->assertCreated();
});

it('rejects a friend request to a nonexistent user', function () {
    $alice = User::factory()->create();

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'ghost'])
        ->assertUnprocessable()->assertJsonValidationErrors('identifier');
});

it('rejects a friend request to yourself', function () {
    $alice = User::factory()->create(['username' => 'alice']);

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'alice'])
        ->assertUnprocessable()->assertJsonValidationErrors('identifier');
});

it('auto-accepts when the target already sent a pending request', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create(['username' => 'bob']);
    Friendship::create(['requester_id' => $bob->id, 'addressee_id' => $alice->id, 'status' => 'pending']);

    $response = $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob']);

    $response->assertOk()->assertJsonPath('status', 'accepted');
    expect(Friendship::where(['requester_id' => $bob->id, 'addressee_id' => $alice->id])->first()->status)
        ->toBe('accepted');
});

it('rejects a duplicate friend request when already friends', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create(['username' => 'bob']);
    Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'accepted']);

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob'])
        ->assertUnprocessable()->assertJsonValidationErrors('identifier');
});

it('allows sending a request to a new person even when the sender already has an unrelated accepted friend where they are the addressee', function () {
    $alice = User::factory()->create();
    $carol = User::factory()->create();
    $bob = User::factory()->create(['username' => 'bob']);
    // Carol -> Alice, accepted: Alice is the *addressee* here.
    Friendship::create(['requester_id' => $carol->id, 'addressee_id' => $alice->id, 'status' => 'accepted']);

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob'])
        ->assertCreated()->assertJsonPath('status', 'pending');
});

it('allows sending a request to someone who already has an unrelated accepted friend where they are the requester', function () {
    $alice = User::factory()->create();
    $carol = User::factory()->create();
    $bob = User::factory()->create(['username' => 'bob']);
    // Bob -> Carol, accepted: Bob is the *requester* here, unrelated to Alice.
    Friendship::create(['requester_id' => $bob->id, 'addressee_id' => $carol->id, 'status' => 'accepted']);

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob'])
        ->assertCreated()->assertJsonPath('status', 'pending');
});

it('does not list an unrelated existing friend as the target when incorrectly blocked', function () {
    $alice = User::factory()->create();
    $carol = User::factory()->create();
    $bob = User::factory()->create(['username' => 'bob']);
    Friendship::create(['requester_id' => $carol->id, 'addressee_id' => $alice->id, 'status' => 'accepted']);

    $this->actingAs($alice)->postJson('/api/friends/requests', ['identifier' => 'bob'])->assertCreated();

    $response = $this->actingAs($alice)->getJson('/api/friends');
    expect(collect($response->json())->pluck('user.id')->all())->toBe([$carol->id]);
    expect(collect($response->json())->pluck('user.id')->all())->not->toContain($bob->id);
});

it('accepts an incoming friend request', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $friendship = Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'pending']);

    $this->actingAs($bob)->postJson("/api/friends/requests/{$friendship->id}/accept")
        ->assertOk()->assertJsonPath('status', 'accepted');
});

it('prevents the requester from accepting their own request', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $friendship = Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'pending']);

    $this->actingAs($alice)->postJson("/api/friends/requests/{$friendship->id}/accept")
        ->assertForbidden();
});

it('declines an incoming friend request', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $friendship = Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'pending']);

    $this->actingAs($bob)->postJson("/api/friends/requests/{$friendship->id}/decline")
        ->assertOk()->assertJsonPath('status', 'declined');
});

it('lists accepted friends both directions', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $carol = User::factory()->create();
    Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'accepted']);
    Friendship::create(['requester_id' => $carol->id, 'addressee_id' => $alice->id, 'status' => 'accepted']);
    Friendship::create(['requester_id' => $alice->id, 'addressee_id' => User::factory()->create()->id, 'status' => 'pending']);

    $response = $this->actingAs($alice)->getJson('/api/friends');

    $response->assertOk();
    expect(collect($response->json())->pluck('user.id')->sort()->values()->all())
        ->toBe(collect([$bob->id, $carol->id])->sort()->values()->all());
    expect(collect($response->json())->pluck('friendship_id'))->each->not->toBeNull();
});

it('lists incoming and outgoing pending requests', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $carol = User::factory()->create();
    Friendship::create(['requester_id' => $bob->id, 'addressee_id' => $alice->id, 'status' => 'pending']);
    Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $carol->id, 'status' => 'pending']);

    $response = $this->actingAs($alice)->getJson('/api/friends/requests');

    $response->assertOk()
        ->assertJsonCount(1, 'incoming')
        ->assertJsonCount(1, 'outgoing');
});

it('removes a friendship', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $friendship = Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'accepted']);

    $this->actingAs($alice)->deleteJson("/api/friends/{$friendship->id}")->assertNoContent();
    expect(Friendship::find($friendship->id))->toBeNull();
});

it('prevents an unrelated user from removing a friendship', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $mallory = User::factory()->create();
    $friendship = Friendship::create(['requester_id' => $alice->id, 'addressee_id' => $bob->id, 'status' => 'accepted']);

    $this->actingAs($mallory)->deleteJson("/api/friends/{$friendship->id}")->assertForbidden();
});
