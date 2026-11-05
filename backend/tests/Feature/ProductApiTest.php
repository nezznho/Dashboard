<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_products_are_paginated_and_return_json_api_fields(): void
    {
        $category = Category::factory()->create();
        Product::factory(12)->for($category)->create();

        $response = $this->getJson('/api/v1/products?per_page=10');

        $response->assertOk()
            ->assertJsonPath('status', 200)
            ->assertJsonPath('meta.total', 12)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data' => [[
                    'type',
                    'id',
                    'attributes' => ['name', 'price', 'createdAt'],
                    'relationships' => ['category' => ['data' => ['type', 'id'], 'links' => ['self']]],
                    'links' => ['self'],
                ]],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertArrayNotHasKey('description', $response->json('data.0.attributes'));
    }

    public function test_product_detail_includes_description_and_category_filter_works(): void
    {
        $category = Category::factory()->create();
        $product = Product::factory()->for($category)->create();
        Product::factory()->create();

        $this->getJson("/api/v1/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.attributes.description', $product->description);

        $this->getJson("/api/v1/products?category_id={$category->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $product->id);
    }

    public function test_dashboard_and_query_examples_return_aggregates(): void
    {
        Category::factory()->create(['name' => 'Electronics']);
        Product::factory(2)->create(['category_id' => Category::query()->value('id'), 'price' => 12.50]);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.total_products', 2)
            ->assertJsonPath('data.stats.total_categories', 1);

        $this->getJson('/api/v1/products/queries')
            ->assertOk()
            ->assertJsonPath('data.aggregates.total_price', 25)
            ->assertJsonPath('data.electronics_products.0.category.name', 'Electronics');
    }
}
