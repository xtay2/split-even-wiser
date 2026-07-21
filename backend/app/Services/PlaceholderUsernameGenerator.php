<?php

namespace App\Services;

use App\Models\User;

class PlaceholderUsernameGenerator
{
    /**
     * Turn a free-text display name into a unique username that satisfies the same rules
     * enforced everywhere else in the app (AuthController::verify, ProfileController::update):
     * 3-30 chars, [a-zA-Z0-9_.] only.
     */
    public function generate(string $name): string
    {
        $slug = strtolower((string) preg_replace('/[^a-zA-Z0-9_.]+/', '.', trim($name)));
        $slug = trim($slug, '.');

        if (strlen($slug) < 3) {
            $slug = 'member';
        }

        $base = substr($slug, 0, 26);

        $username = str_pad($base, 3, '0');
        $suffix = 1;

        while (User::query()->where('username', $username)->exists()) {
            $suffix++;
            $candidate = $base.'.'.$suffix;
            $username = substr($candidate, 0, 30);
        }

        return $username;
    }
}
