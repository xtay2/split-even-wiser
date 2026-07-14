<?php

use App\Models\User;

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
