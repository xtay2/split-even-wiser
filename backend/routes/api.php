<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FriendshipController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\PlaceholderController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\SettlementController;
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
    Route::post('/me/email', [ProfileController::class, 'requestEmailChange'])
        ->middleware('throttle:6,1');
    Route::post('/me/email/confirm', [ProfileController::class, 'confirmEmailChange']);

    Route::get('/friends', [FriendshipController::class, 'index']);
    Route::get('/friends/requests', [FriendshipController::class, 'requests']);
    Route::post('/friends/requests', [FriendshipController::class, 'store']);
    Route::post('/friends/requests/{friendship}/accept', [FriendshipController::class, 'accept']);
    Route::post('/friends/requests/{friendship}/decline', [FriendshipController::class, 'decline']);
    Route::delete('/friends/{friendship}', [FriendshipController::class, 'destroy']);

    Route::get('/push/vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    Route::post('/push/subscription', [PushSubscriptionController::class, 'store']);
    Route::delete('/push/subscription', [PushSubscriptionController::class, 'destroy']);

    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::patch('/groups/{group}', [GroupController::class, 'update']);
    Route::post('/groups/{group}/members', [GroupController::class, 'addMember']);
    Route::delete('/groups/{group}/members/{user}', [GroupController::class, 'leave']);
    Route::post('/groups/{group}/placeholders', [PlaceholderController::class, 'store']);
    Route::post('/groups/{group}/placeholders/{user}/claim', [PlaceholderController::class, 'claim']);
    Route::get('/groups/{group}/balances', [GroupController::class, 'balances']);
    Route::get('/groups/{group}/activity', [GroupController::class, 'activity']);

    Route::get('/groups/{group}/expenses', [ExpenseController::class, 'index']);
    Route::post('/groups/{group}/expenses', [ExpenseController::class, 'store']);
    Route::get('/groups/{group}/expenses/{expense}', [ExpenseController::class, 'show']);
    Route::patch('/groups/{group}/expenses/{expense}', [ExpenseController::class, 'update']);
    Route::delete('/groups/{group}/expenses/{expense}', [ExpenseController::class, 'destroy']);
    Route::get('/groups/{group}/expenses/{expense}/history', [ExpenseController::class, 'history']);

    Route::get('/groups/{group}/settlements', [SettlementController::class, 'index']);
    Route::post('/groups/{group}/settlements', [SettlementController::class, 'store']);
    Route::get('/groups/{group}/settlements/{settlement}', [SettlementController::class, 'show']);
    Route::patch('/groups/{group}/settlements/{settlement}', [SettlementController::class, 'update']);
    Route::delete('/groups/{group}/settlements/{settlement}', [SettlementController::class, 'destroy']);
});
