<?php

namespace App\Notifications;

use App\Models\Expense;
use App\Models\Group;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class ExpenseAdded extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Group $group,
        public readonly Expense $expense,
        public readonly User $creator,
        public readonly string $title,
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
            ->title("New expense in \"{$this->group->name}\"")
            ->body("{$this->creator->username} added \"{$this->title}\" ({$this->amount} {$this->currency}).")
            ->data([
                'group_id' => $this->group->id,
                'expense_id' => $this->expense->id,
                'url' => "/groups/{$this->group->id}/expenses/{$this->expense->id}",
            ])
            ->action('View', 'view_expense');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'group_id' => $this->group->id,
            'expense_id' => $this->expense->id,
            'creator_id' => $this->creator->id,
        ];
    }
}
