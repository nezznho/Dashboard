<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponses
{
    protected function ok(string $message, mixed $data = [], int $statusCode = 200): JsonResponse
    {
        return $this->success($message, $data, $statusCode);
    }

    protected function success(string $message, mixed $data = [], int $statusCode = 200, array $meta = []): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'message' => $message,
            'status' => $statusCode,
            ...($meta === [] ? [] : ['meta' => $meta]),
        ], $statusCode);
    }

    protected function error(string $message, int $statusCode): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'status' => $statusCode,
        ], $statusCode);
    }
}
