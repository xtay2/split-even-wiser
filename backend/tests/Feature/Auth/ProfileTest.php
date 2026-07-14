<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('updates the authenticated user\'s username', function () {
    $user = User::factory()->create(['username' => 'original']);

    $response = $this->actingAs($user)->patchJson('/api/me', ['username' => 'updated']);

    $response->assertOk()->assertJsonPath('username', 'updated');
    expect($user->fresh()->username)->toBe('updated');
});

it('rejects a username already taken by someone else', function () {
    User::factory()->create(['username' => 'taken']);
    $user = User::factory()->create(['username' => 'mine']);

    $response = $this->actingAs($user)->patchJson('/api/me', ['username' => 'taken']);

    $response->assertUnprocessable()->assertJsonValidationErrors('username');
});

it('uploads and replaces the user\'s avatar', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/me/avatar', [
        'avatar' => UploadedFile::fake()->image('avatar.png'),
    ]);

    $response->assertOk();
    $path = $response->json('avatar_path');
    Storage::disk('public')->assertExists($path);

    $secondUpload = UploadedFile::fake()->image('avatar2.png');
    $this->actingAs($user)->postJson('/api/me/avatar', ['avatar' => $secondUpload])->assertOk();

    Storage::disk('public')->assertMissing($path);
});

it('rejects a non-image avatar upload', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/me/avatar', [
        'avatar' => UploadedFile::fake()->create('not-an-image.txt', 10),
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('avatar');
});
