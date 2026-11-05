<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderProduct;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $categories = collect([
                ['name' => 'Electronics', 'description' => 'Everyday technology and accessories.'],
                ['name' => 'Books', 'description' => 'Books for learning, work, and leisure.'],
                ['name' => 'Clothing', 'description' => 'Comfortable clothing and accessories.'],
                ['name' => 'Home and Kitchen', 'description' => 'Useful essentials for home and kitchen.'],
                ['name' => 'Sports', 'description' => 'Gear for training and outdoor activities.'],
            ])->map(fn (array $category) => Category::factory()->create($category));

            $products = Product::factory(2000)->recycle($categories)->create();
            $users = User::factory(20)->create();

            $users->each(function (User $user): void {
                Address::factory(fake()->numberBetween(1, 2))->for($user)->create();
            });

            $orders = $users->flatMap(function (User $user) {
                return Order::factory(fake()->numberBetween(0, 5))->for($user)->create();
            });

            $orders->each(function (Order $order) use ($products): void {
                $products->random(fake()->numberBetween(1, 4))->each(function (Product $product) use ($order): void {
                    OrderProduct::factory()->for($order)->for($product)->create();
                });
            });

            $products->each(function (Product $product) use ($users): void {
                $users->random(fake()->numberBetween(0, 8))->each(function (User $user) use ($product): void {
                    Review::factory()->for($user)->for($product)->create();
                });
            });
        });
    }
}
