<?php

use App\Models\User;

it('exposes the VAPID public key to authenticated users', function () {
    config(['webpush.vapid.public_key' => 'test-public-key']);
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/push/vapid-public-key')
        ->assertOk()->assertJsonPath('public_key', 'test-public-key');
});

it('stores a push subscription for the authenticated user', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/push/subscription', [
        'endpoint' => 'https://push.example.com/abc123',
        'keys' => ['p256dh' => 'pubkey', 'auth' => 'authtoken'],
    ]);

    $response->assertCreated();
    expect($user->pushSubscriptions()->where('endpoint', 'https://push.example.com/abc123')->exists())->toBeTrue();
});

it('removes a push subscription by endpoint', function () {
    $user = User::factory()->create();
    $user->updatePushSubscription(endpoint: 'https://push.example.com/abc123', key: 'k', token: 't');

    $response = $this->actingAs($user)->deleteJson('/api/push/subscription', [
        'endpoint' => 'https://push.example.com/abc123',
    ]);

    $response->assertNoContent();
    expect($user->pushSubscriptions()->where('endpoint', 'https://push.example.com/abc123')->exists())->toBeFalse();
});
