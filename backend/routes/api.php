<?php

use App\Http\Controllers\Api\V1\ProductController;
use App\Models\Category;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/', fn () => response()->json([
        'data' => ['name' => 'Product Management API', 'version' => 'v1'],
        'message' => 'API is ready',
        'status' => 200,
    ]));

    Route::get('/dashboard', [ProductController::class, 'dashboard'])->name('dashboard');
    Route::get('/products/queries', [ProductController::class, 'queries'])->name('products.queries');

    Route::get('/categories', function () {
        return response()->json([
            'data' => Category::query()
                ->withCount('products')
                ->withSum('products', 'price')
                ->orderBy('name')
                ->get(['id', 'name', 'description']),
            'message' => 'Categories retrieved successfully',
            'status' => 200,
        ]);
    })->name('categories.index');

    Route::get('/categories/{category}', function (Category $category) {
        return response()->json([
            'data' => $category,
            'message' => 'Category retrieved successfully',
            'status' => 200,
        ]);
    })->name('categories.show');

    Route::apiResource('products', ProductController::class)
        ->only(['index', 'show'])
        ->names(['index' => 'products.index', 'show' => 'products.show']);
});
