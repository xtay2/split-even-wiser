<?php

use App\Models\Group;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

// The "array" cache store backing the rate limiter is a plain in-memory array that
// otherwise leaks attempt counts across test cases within the same suite run.
beforeEach(fn () => Illuminate\Support\Facades\Cache::flush());

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
*/

function groupWithMembers(User ...$users): Group
{
    $group = Group::factory()->create(['created_by' => $users[0]->id]);

    foreach ($users as $user) {
        $group->groupMembers()->create(['user_id' => $user->id, 'joined_at' => now()]);
    }

    return $group;
}

