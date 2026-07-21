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
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('display_name')->nullable()->after('username');
            $table->boolean('is_placeholder')->default(false)->after('avatar_path');
            $table->foreignId('invited_by')->nullable()->after('is_placeholder')->constrained('users')->nullOnDelete();
            $table->timestamp('claimed_at')->nullable()->after('invited_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('invited_by');
            $table->dropColumn(['display_name', 'is_placeholder', 'claimed_at']);
            $table->string('email')->nullable(false)->change();
        });
    }
};
