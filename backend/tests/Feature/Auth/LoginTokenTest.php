<?php

use App\Mail\LoginTokenMail;
use App\Models\LoginToken;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

it('sends a login token email and creates a token record for a new email', function () {
    Mail::fake();

    $response = $this->postJson('/api/auth/request-token', ['email' => 'alice@example.com']);

    $response->assertOk();
    expect(LoginToken::where('email', 'alice@example.com')->count())->toBe(1);
    Mail::assertQueued(LoginTokenMail::class, fn ($mail) => $mail->email === 'alice@example.com');
});

it('requires a username to create an account for a first-time email', function () {
    $token = LoginToken::issueFor('newperson@example.com');

    $response = $this->postJson('/api/auth/verify', [
        'email' => 'newperson@example.com',
        'token' => $token,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('username');
    expect(User::where('email', 'newperson@example.com')->exists())->toBeFalse();
});

it('creates an account and issues an api token when verifying with a username', function () {
    $token = LoginToken::issueFor('newperson@example.com');

    $response = $this->postJson('/api/auth/verify', [
        'email' => 'newperson@example.com',
        'token' => $token,
        'username' => 'newperson',
    ]);

    $response->assertOk()
        ->assertJsonPath('user.username', 'newperson')
        ->assertJsonPath('user.email', 'newperson@example.com')
        ->assertJsonStructure(['user', 'token']);

    expect(User::where('email', 'newperson@example.com')->exists())->toBeTrue();
});

it('logs in an existing user without requiring a username', function () {
    $user = User::factory()->create(['email' => 'returning@example.com']);
    $token = LoginToken::issueFor('returning@example.com');

    $response = $this->postJson('/api/auth/verify', [
        'email' => 'returning@example.com',
        'token' => $token,
    ]);

    $response->assertOk()->assertJsonPath('user.id', $user->id);
});

it('rejects an invalid token', function () {
    $response = $this->postJson('/api/auth/verify', [
        'email' => 'nobody@example.com',
        'token' => 'not-a-real-token',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('token');
});

it('rejects a token that has already been consumed', function () {
    $token = LoginToken::issueFor('reuse@example.com');

    $this->postJson('/api/auth/verify', [
        'email' => 'reuse@example.com',
        'token' => $token,
        'username' => 'reuseuser',
    ])->assertOk();

    $response = $this->postJson('/api/auth/verify', [
        'email' => 'reuse@example.com',
        'token' => $token,
        'username' => 'differentuser',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('token');
});

it('rejects an expired token', function () {
    $user = User::factory()->create(['email' => 'expired@example.com']);
    $loginToken = LoginToken::create([
        'email' => 'expired@example.com',
        'token_hash' => hash('sha256', 'expired-token'),
        'expires_at' => now()->subMinute(),
    ]);

    $response = $this->postJson('/api/auth/verify', [
        'email' => 'expired@example.com',
        'token' => 'expired-token',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('token');
});

it('allows an authenticated user to fetch their own profile', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/me');

    $response->assertOk()->assertJsonPath('id', $user->id);
});

it('rejects unauthenticated access to profile endpoints', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});
