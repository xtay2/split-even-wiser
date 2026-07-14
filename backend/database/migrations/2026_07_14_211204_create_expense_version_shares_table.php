<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('expense_version_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_version_id')->constrained('expense_versions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->decimal('share_amount', 12, 2);

            $table->unique(['expense_version_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_version_shares');
    }
};
