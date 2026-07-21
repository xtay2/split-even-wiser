<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\LoginTokenMail;
use App\Models\LoginToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function requestToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $token = LoginToken::issueFor($data['email']);

        Mail::to($data['email'])->send(new LoginTokenMail($data['email'], $token));

        return response()->json([
            'message' => 'If that email is valid, a login link has been sent.',
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'username' => ['nullable', 'string', 'min:3', 'max:30', 'regex:/^[a-zA-Z0-9_.]+$/', 'unique:users,username'],
        ]);

        $loginToken = LoginToken::findValid($data['email'], $data['token']);

        if (! $loginToken) {
            throw ValidationException::withMessages([
                'token' => 'This login link is invalid or has expired.',
            ]);
        }

        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            if (empty($data['username'])) {
                throw ValidationException::withMessages([
                    'username' => 'A username is required to create your account.',
                ]);
            }

            $user = User::create([
                'email' => $data['email'],
                'username' => $data['username'],
            ]);
        } elseif ($user->is_placeholder) {
            // Logging in with the placeholder's own email is itself the claim — no separate
            // merge needed, this is the same row becoming a real, login-capable account.
            $user->update(['is_placeholder' => false, 'claimed_at' => now()]);
        }

        $loginToken->update(['consumed_at' => now()]);

        $accessToken = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $accessToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(status: 204);
    }
}
