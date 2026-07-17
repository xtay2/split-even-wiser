<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmailChangeMail;
use App\Models\EmailChangeToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => [
                'sometimes', 'string', 'min:3', 'max:30', 'regex:/^[a-zA-Z0-9_.]+$/',
                'unique:users,username,'.$request->user()->id,
            ],
        ]);

        $request->user()->update($data);

        return response()->json($request->user());
    }

    public function requestEmailChange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        ]);

        if ($data['email'] === $request->user()->email) {
            throw ValidationException::withMessages([
                'email' => 'That is already your email address.',
            ]);
        }

        $token = EmailChangeToken::issueFor($request->user()->id, $data['email']);

        Mail::to($data['email'])->send(new EmailChangeMail($data['email'], $token));

        return response()->json([
            'message' => 'Check your new inbox to confirm the change.',
        ]);
    }

    public function confirmEmailChange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
        ]);

        $changeToken = EmailChangeToken::findValid($request->user()->id, $data['email'], $data['token']);

        if (! $changeToken) {
            throw ValidationException::withMessages([
                'token' => 'This confirmation link is invalid or has expired.',
            ]);
        }

        if (User::where('email', $data['email'])->where('id', '!=', $request->user()->id)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'That email address is already in use.',
            ]);
        }

        $request->user()->update(['email' => $data['email']]);
        $changeToken->update(['consumed_at' => now()]);

        return response()->json($request->user());
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:4096'],
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar_path' => $path]);

        return response()->json($user);
    }
}
