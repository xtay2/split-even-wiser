<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class FriendRequestReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly User $requester,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('New friend request')
            ->body("{$this->requester->username} wants to be your friend.")
            ->data(['friendship_requester_id' => $this->requester->id])
            ->action('View', 'view_friend_request');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'requester_id' => $this->requester->id,
            'requester_username' => $this->requester->username,
        ];
    }
}
