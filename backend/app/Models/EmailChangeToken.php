<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class EmailChangeToken extends Model
{
    protected $fillable = [
        'user_id',
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
     * Create a new token for the given user and candidate email, returning the plaintext
     * token. Only the hash is persisted.
     */
    public static function issueFor(int $userId, string $email): string
    {
        $plaintext = Str::random(64);

        self::create([
            'user_id' => $userId,
            'email' => $email,
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addMinutes(15),
        ]);

        return $plaintext;
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->whereNull('consumed_at')->where('expires_at', '>', Carbon::now());
    }

    public static function findValid(int $userId, string $email, string $plaintext): ?self
    {
        return self::query()
            ->valid()
            ->where('user_id', $userId)
            ->where('email', $email)
            ->where('token_hash', hash('sha256', $plaintext))
            ->first();
    }
}
