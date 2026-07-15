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
        // Offline clients generate a UUID for expenses/settlements created while offline and
        // resend it when syncing back up, so a retried request (e.g. after a dropped
        // connection mid-sync) updates/returns the original record instead of duplicating it.
        Schema::table('expenses', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('created_by');
        });

        Schema::table('settlements', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('client_uuid');
        });

        Schema::table('settlements', function (Blueprint $table) {
            $table->dropColumn('client_uuid');
        });
    }
};
