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
        // Groups and placeholders can be created while offline, too. Like expenses and
        // settlements, a retried sync resends the same client_uuid, so it returns the original
        // record instead of creating a duplicate.
        Schema::table('groups', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('created_by');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('invited_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropColumn('client_uuid');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('client_uuid');
        });
    }
};
