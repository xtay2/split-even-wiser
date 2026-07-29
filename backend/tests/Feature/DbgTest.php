<?php
it('dumps effective cache/db config', function () {
    dump([
        'cache.default' => config('cache.default'),
        'db.default' => config('database.default'),
        'app.env' => config('app.env'),
    ]);
    expect(true)->toBeTrue();
});
