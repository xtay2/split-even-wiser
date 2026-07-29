<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class LoginToken extends Model
{
    protected $fillable = [
        'email',
        'token_hash',
        'code_hash',
        'expires_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * Create a new token for the given email, returning the plaintext token and its short
     * numeric companion code. Only hashes are persisted. Regular login links are short-lived
     * (15 minutes); callers that send a link someone might not open right away (e.g. a group
     * invite email) can pass a longer TTL. The code lets a user log in by typing digits instead
     * of following the link — needed on iOS, where tapping a Mail link always opens Safari
     * rather than an installed home-screen PWA, so the link is often useless there.
     *
     * @return array{token: string, code: string}
     */
    public static function issueFor(string $email, int $minutes = 15): array
    {
        $plaintext = Str::random(64);
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        self::create([
            'email' => $email,
            'token_hash' => hash('sha256', $plaintext),
            'code_hash' => hash('sha256', $code),
            'expires_at' => now()->addMinutes($minutes),
        ]);

        return ['token' => $plaintext, 'code' => $code];
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->whereNull('consumed_at')->where('expires_at', '>', Carbon::now());
    }

    public static function findValid(string $email, string $plaintext): ?self
    {
        return self::query()
            ->valid()
            ->where('email', $email)
            ->where('token_hash', hash('sha256', $plaintext))
            ->first();
    }

    public static function findValidByCode(string $email, string $code): ?self
    {
        return self::query()
            ->valid()
            ->where('email', $email)
            ->where('code_hash', hash('sha256', $code))
            ->first();
    }
}
