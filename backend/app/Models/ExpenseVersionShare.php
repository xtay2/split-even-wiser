<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseVersionShare extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'expense_version_id',
        'user_id',
        'share_amount',
    ];

    protected function casts(): array
    {
        return [
            'share_amount' => 'decimal:2',
        ];
    }

    public function expenseVersion(): BelongsTo
    {
        return $this->belongsTo(ExpenseVersion::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
