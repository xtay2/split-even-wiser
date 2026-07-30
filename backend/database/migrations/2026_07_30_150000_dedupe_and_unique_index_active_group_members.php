<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // A racing double-submit (e.g. a client effect firing twice) could previously create two
        // active membership rows for the same group+user before either had committed. Keep only
        // the earliest such row per (group_id, user_id) before the unique index below forbids it.
        DB::statement(<<<'SQL'
            DELETE FROM group_members a
            USING group_members b
            WHERE a.left_at IS NULL
              AND b.left_at IS NULL
              AND a.group_id = b.group_id
              AND a.user_id = b.user_id
              AND a.id > b.id
        SQL);

        DB::statement(
            'CREATE UNIQUE INDEX group_members_active_unique ON group_members (group_id, user_id) WHERE left_at IS NULL'
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS group_members_active_unique');
    }
};
