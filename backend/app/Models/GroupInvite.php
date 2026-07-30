<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class GroupInvite extends Model
{
    protected $fillable = [
        'group_id',
        'created_by',
        'token_hash',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Issue a fresh invite link for the group, returning the plaintext token (only ever
     * available at creation time - only its hash is persisted). A group has at most one
     * active link at a time, so any existing invites for it are replaced.
     *
     * @return array{invite: self, token: string}
     */
    public static function issueFor(Group $group, User $creator, ?int $minutes): array
    {
        self::where('group_id', $group->id)->delete();

        $plaintext = Str::random(32);

        $invite = self::create([
            'group_id' => $group->id,
            'created_by' => $creator->id,
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => $minutes !== null ? now()->addMinutes($minutes) : null,
        ]);

        return ['invite' => $invite, 'token' => $plaintext];
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query->whereNull('expires_at')->orWhere('expires_at', '>', Carbon::now());
        });
    }

    public static function findValid(string $plaintext): ?self
    {
        return self::query()
            ->valid()
            ->where('token_hash', hash('sha256', $plaintext))
            ->first();
    }
}
