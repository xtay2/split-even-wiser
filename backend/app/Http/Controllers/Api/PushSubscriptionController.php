<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function vapidPublicKey(): JsonResponse
    {
        return response()->json(['public_key' => config('webpush.vapid.public_key')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string'],
            'keys.p256dh' => ['nullable', 'string'],
            'keys.auth' => ['nullable', 'string'],
            'contentEncoding' => ['nullable', 'string'],
        ]);

        $request->user()->updatePushSubscription(
            endpoint: $data['endpoint'],
            key: $data['keys']['p256dh'] ?? null,
            token: $data['keys']['auth'] ?? null,
            contentEncoding: $data['contentEncoding'] ?? null,
        );

        return response()->json(status: 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string'],
        ]);

        $request->user()->deletePushSubscription($data['endpoint']);

        return response()->json(status: 204);
    }
}
