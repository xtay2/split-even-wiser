<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class FriendRequestAccepted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly User $accepter,
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
            ->title('Friend request accepted')
            ->body("{$this->accepter->username} accepted your friend request.")
            ->data(['accepter_id' => $this->accepter->id, 'url' => '/friends'])
            ->action('View', 'view_friend_request');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'accepter_id' => $this->accepter->id,
            'accepter_username' => $this->accepter->username,
        ];
    }
}
