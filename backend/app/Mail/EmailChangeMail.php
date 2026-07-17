<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailChangeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $email,
        public readonly string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirm your new Split Even Wiser email address',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-change',
            with: [
                'verifyUrl' => sprintf(
                    '%s/profile/email/verify?token=%s&email=%s',
                    rtrim(config('app.frontend_url'), '/'),
                    urlencode($this->token),
                    urlencode($this->email),
                ),
            ],
        );
    }
}
