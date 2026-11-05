# Stockwise product dashboard

A React inventory dashboard backed by a Laravel 12 JSON API. The Laravel activity includes Eloquent relationships, factories, seed data, JSON API product resources, pagination, and examples of filtering and aggregation.

## Requirements

- PHP 8.2+
- Composer
- Node.js 20.19+ or 22.12+

## Run locally

From the project root, install the React dependencies and start Vite:

```powershell
npm install
npm run dev
```

In a second terminal:

```powershell
cd backend
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` requests to `http://127.0.0.1:8000`.

The default Laravel database is SQLite. The seeder creates five product categories, 2,000 products, users, addresses, orders, order items, and reviews.

## API endpoints

- `GET /api/v1` — API status
- `GET /api/v1/dashboard` — inventory totals, categories, and recently added products
- `GET /api/v1/categories` — categories and product counts/value
- `GET /api/v1/products` — paginated products (`page`, `per_page`, `search`, `category_id`, `sort`, `direction`)
- `GET /api/v1/products/{id}` — product detail, including description
- `GET /api/v1/products/queries` — Eloquent relationship, filtering, sorting, and aggregate examples

Run API feature tests from `backend` with `php artisan test`.
