<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GroupInviteMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $email,
        public readonly string $token,
        public readonly string $inviterName,
        public readonly string $groupName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->inviterName} added you to \"{$this->groupName}\" on Split Even Wiser",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.group-invite',
            with: [
                'inviterName' => $this->inviterName,
                'groupName' => $this->groupName,
                'verifyUrl' => sprintf(
                    '%s/login/verify?token=%s&email=%s',
                    rtrim(config('app.frontend_url'), '/'),
                    urlencode($this->token),
                    urlencode($this->email),
                ),
            ],
        );
    }
}
