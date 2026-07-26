<?php

namespace App\Notifications;

use App\Models\Group;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class SettlementRecorded extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Group $group,
        public readonly Settlement $settlement,
        public readonly User $fromUser,
        public readonly string $amount,
        public readonly string $currency,
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
            ->title('Settlement recorded')
            ->body("{$this->fromUser->username} marked {$this->amount} {$this->currency} as settled with you in \"{$this->group->name}\".")
            ->data([
                'group_id' => $this->group->id,
                'settlement_id' => $this->settlement->id,
                'url' => "/groups/{$this->group->id}/settlements/{$this->settlement->id}",
            ])
            ->action('View', 'view_settlement');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'group_id' => $this->group->id,
            'settlement_id' => $this->settlement->id,
            'from_user_id' => $this->fromUser->id,
        ];
    }
}
