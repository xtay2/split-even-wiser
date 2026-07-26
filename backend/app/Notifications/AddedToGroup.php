<?php

namespace App\Notifications;

use App\Models\Group;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class AddedToGroup extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Group $group,
        public readonly User $addedBy,
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
            ->title('Added to group')
            ->body("{$this->addedBy->username} added you to \"{$this->group->name}\".")
            ->data(['group_id' => $this->group->id, 'url' => "/groups/{$this->group->id}"])
            ->action('View', 'view_group');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'group_id' => $this->group->id,
            'added_by_id' => $this->addedBy->id,
        ];
    }
}
