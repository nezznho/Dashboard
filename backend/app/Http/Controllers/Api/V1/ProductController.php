<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Traits\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    use ApiResponses;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
            'sort' => ['nullable', 'in:name,price,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $query = Product::query()->with('category');

        if (! empty($filters['search'])) {
            $query->where(function ($builder) use ($filters): void {
                $builder->where('name', 'like', '%'.$filters['search'].'%')
                    ->orWhere('description', 'like', '%'.$filters['search'].'%');
            });
        }

        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';
        $products = $query->orderBy($sort, $direction)
            ->paginate($filters['per_page'] ?? 10)
            ->appends($request->query());
        $collection = ProductResource::collection($products)->response()->getData(true);

        return response()->json([
            'data' => $collection['data'],
            'message' => 'Products retrieved successfully',
            'status' => 200,
            'links' => $collection['links'],
            'meta' => $collection['meta'],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load('category');

        return $this->ok('Product retrieved successfully', new ProductResource($product));
    }

    public function dashboard(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('products')
            ->withSum('products', 'price')
            ->orderBy('name')
            ->get(['id', 'name', 'description']);
        $recentProducts = Product::query()->with('category')->latest()->limit(5)->get();

        return $this->ok('Dashboard data retrieved successfully', [
            'stats' => [
                'total_products' => Product::count(),
                'total_categories' => Category::count(),
                'total_value' => Product::sum('price'),
                'average_price' => Product::avg('price'),
            ],
            'categories' => $categories,
            'recent_products' => ProductResource::collection($recentProducts)->resolve(),
        ]);
    }

    public function queries(): JsonResponse
    {
        $nameAndPrice = Product::select('name', 'price')->get();
        $productsWithCategory = Product::with('category')->get();
        $productsOrderedByPrice = Product::select('id', 'name')->orderBy('price')->get();
        $firstFiveProducts = Product::with('category')->limit(5)->get();
        $priceGreaterThanOrEqual = Product::where('price', '>=', 3)->get();
        $electronics = Product::with('category')
            ->whereHas('category', fn ($query) => $query->where('name', 'Electronics'))
            ->get();

        $totalPricePerCategory = Product::join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('SUM(products.price) as total_price'))
            ->groupBy('categories.name')
            ->get();
        $averagePricePerCategory = Product::join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('AVG(products.price) as avg_price'))
            ->groupBy('categories.name')
            ->get();
        $lowestPricePerCategory = Product::join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('MIN(products.price) as min_price'))
            ->groupBy('categories.name')
            ->get();
        $averagePriceSorted = Product::join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('AVG(products.price) as avg_price'))
            ->groupBy('categories.name')
            ->orderBy('avg_price')
            ->get();
        $electronicsAndBooks = Product::join('categories', 'products.category_id', '=', 'categories.id')
            ->whereIn('categories.name', ['Electronics', 'Books'])
            ->select('categories.name', DB::raw('AVG(products.price) as avg_price'))
            ->groupBy('categories.name')
            ->get();

        return $this->success('Query results retrieved successfully', [
            'name_and_price' => $nameAndPrice,
            'products_with_category' => $productsWithCategory,
            'products_ordered_by_price' => $productsOrderedByPrice,
            'first_five_products' => $firstFiveProducts,
            'price_greater_than_or_equal_to_3' => $priceGreaterThanOrEqual,
            'electronics_products' => $electronics,
            'aggregates' => [
                'total_price' => Product::sum('price'),
                'average_price' => Product::avg('price'),
                'highest_price' => Product::max('price'),
                'lowest_price' => Product::min('price'),
            ],
            'total_price_per_category' => $totalPricePerCategory,
            'average_price_per_category' => $averagePricePerCategory,
            'lowest_price_per_category' => $lowestPricePerCategory,
            'average_price_sorted' => $averagePriceSorted,
            'electronics_and_books_average' => $electronicsAndBooks,
        ]);
    }
}
