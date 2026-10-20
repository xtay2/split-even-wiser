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
        public readonly User $recordedBy,
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
            ->body($this->describeFor($notifiable))
            ->data([
                'group_id' => $this->group->id,
                'settlement_id' => $this->settlement->id,
                'url' => "/groups/{$this->group->id}/settlements/{$this->settlement->id}",
            ])
            ->action('View', 'view_settlement');
    }

    private function describeFor(object $notifiable): string
    {
        $amount = "{$this->amount} {$this->currency}";
        $group = "\"{$this->group->name}\"";
        $payer = $this->settlement->fromUser;
        $recipient = $this->settlement->toUser;

        if ($this->recordedBy->id === $payer->id) {
            return "{$payer->username} marked {$amount} as settled with you in {$group}.";
        }

        // Recorded on someone else's behalf - name both sides so it's clear who paid whom.
        $payerName = $payer->id === $notifiable->id ? 'you' : $payer->username;
        $recipientName = $recipient->id === $notifiable->id ? 'you' : $recipient->username;

        return "{$this->recordedBy->username} recorded that {$payerName} paid {$amount} to {$recipientName} in {$group}.";
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'group_id' => $this->group->id,
            'settlement_id' => $this->settlement->id,
            'from_user_id' => $this->settlement->from_user_id,
            'recorded_by' => $this->recordedBy->id,
        ];
    }
}
