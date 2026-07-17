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
        Schema::table('expense_versions', function (Blueprint $table) {
            $table->date('date')->nullable()->after('currency');
        });

        DB::table('expense_versions')->whereNull('date')->update([
            'date' => DB::raw('created_at::date'),
        ]);

        Schema::table('expense_versions', function (Blueprint $table) {
            $table->date('date')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expense_versions', function (Blueprint $table) {
            $table->dropColumn('date');
        });
    }
};
