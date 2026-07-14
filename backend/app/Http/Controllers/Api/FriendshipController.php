<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Friendship;
use App\Models\User;
use App\Notifications\FriendRequestReceived;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FriendshipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->friends()->values());
    }

    public function requests(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'incoming' => $user->receivedFriendRequests()->with('requester')->where('status', 'pending')->get(),
            'outgoing' => $user->sentFriendRequests()->with('addressee')->where('status', 'pending')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string'],
        ]);

        $target = User::query()
            ->where('username', $data['identifier'])
            ->orWhere('email', $data['identifier'])
            ->first();

        if (! $target) {
            throw ValidationException::withMessages(['identifier' => 'No matching user was found.']);
        }

        $user = $request->user();

        if ($target->id === $user->id) {
            throw ValidationException::withMessages(['identifier' => 'You cannot send a friend request to yourself.']);
        }

        $existingAccepted = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($user, $target) {
                $query->where(['requester_id' => $user->id, 'addressee_id' => $target->id])
                    ->orWhere(['requester_id' => $target->id, 'addressee_id' => $user->id]);
            })
            ->exists();

        if ($existingAccepted) {
            throw ValidationException::withMessages(['identifier' => 'You are already friends.']);
        }

        // They already sent us a request — accept it instead of creating a duplicate.
        $reverseRequest = Friendship::query()
            ->where('requester_id', $target->id)
            ->where('addressee_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($reverseRequest) {
            $reverseRequest->update(['status' => 'accepted']);

            return response()->json($reverseRequest->fresh(['requester', 'addressee']));
        }

        $friendship = Friendship::updateOrCreate(
            ['requester_id' => $user->id, 'addressee_id' => $target->id],
            ['status' => 'pending'],
        );

        $target->notify(new FriendRequestReceived($user));

        return response()->json($friendship->fresh(['requester', 'addressee']), 201);
    }

    public function accept(Request $request, Friendship $friendship): JsonResponse
    {
        $this->authorizeAddressee($request, $friendship);

        $friendship->update(['status' => 'accepted']);

        return response()->json($friendship->fresh(['requester', 'addressee']));
    }

    public function decline(Request $request, Friendship $friendship): JsonResponse
    {
        $this->authorizeAddressee($request, $friendship);

        $friendship->update(['status' => 'declined']);

        return response()->json($friendship->fresh(['requester', 'addressee']));
    }

    public function destroy(Request $request, Friendship $friendship): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            in_array($user->id, [$friendship->requester_id, $friendship->addressee_id], true),
            403,
        );

        $friendship->delete();

        return response()->json(status: 204);
    }

    private function authorizeAddressee(Request $request, Friendship $friendship): void
    {
        abort_unless($friendship->addressee_id === $request->user()->id, 403);
        abort_unless($friendship->status === 'pending', 409, 'This request has already been resolved.');
    }
}
