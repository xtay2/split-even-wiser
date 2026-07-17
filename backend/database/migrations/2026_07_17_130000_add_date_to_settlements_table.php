<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            $table->date('date')->nullable()->after('currency');
        });

        DB::table('settlements')->whereNull('date')->update([
            'date' => DB::raw('created_at::date'),
        ]);

        Schema::table('settlements', function (Blueprint $table) {
            $table->date('date')->nullable(false)->default(DB::raw('CURRENT_DATE'))->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            $table->dropColumn('date');
        });
    }
};
