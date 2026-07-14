<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FriendshipController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PushSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/request-token', [AuthController::class, 'requestToken'])
    ->middleware('throttle:6,1');
Route::post('/auth/verify', [AuthController::class, 'verify'])
    ->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/me', [ProfileController::class, 'show']);
    Route::patch('/me', [ProfileController::class, 'update']);
    Route::post('/me/avatar', [ProfileController::class, 'uploadAvatar']);

    Route::get('/friends', [FriendshipController::class, 'index']);
    Route::get('/friends/requests', [FriendshipController::class, 'requests']);
    Route::post('/friends/requests', [FriendshipController::class, 'store']);
    Route::post('/friends/requests/{friendship}/accept', [FriendshipController::class, 'accept']);
    Route::post('/friends/requests/{friendship}/decline', [FriendshipController::class, 'decline']);
    Route::delete('/friends/{friendship}', [FriendshipController::class, 'destroy']);

    Route::post('/push/subscription', [PushSubscriptionController::class, 'store']);
    Route::delete('/push/subscription', [PushSubscriptionController::class, 'destroy']);
});
