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
     * Create a new token for the given email, returning the plaintext token.
     * Only the hash is persisted. Regular login links are short-lived (15 minutes); callers
     * that send a link someone might not open right away (e.g. a group invite email) can pass
     * a longer TTL.
     */
    public static function issueFor(string $email, int $minutes = 15): string
    {
        $plaintext = Str::random(64);

        self::create([
            'email' => $email,
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addMinutes($minutes),
        ]);

        return $plaintext;
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
}
