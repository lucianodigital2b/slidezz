<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Services\Posts\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PostController extends Controller
{
    public function __construct(private readonly PostService $posts) {}

    public function accounts(Request $request): JsonResponse
    {
        $accounts = $this->posts->accounts($request->user());

        return response()->json(['data' => $accounts]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', 'string'],
        ]);

        $schedules = $this->posts->list(
            $request->user(),
            $validated['from'] ?? null,
            $validated['to'] ?? null,
            $validated['status'] ?? null,
        );

        return response()->json(['data' => $schedules->map(fn (Schedule $s) => $this->posts->present($s))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
            'publish_at' => ['required', 'date', 'after:now'],
            'caption' => ['nullable', 'string', 'max:5000'],
            'title' => ['nullable', 'string', 'max:255'],
            'images' => ['required', 'array', 'min:1', 'max:35'],
            'images.*' => ['file', 'image', 'max:20480'],
        ]);

        $schedule = $this->posts->createFromFiles(
            $request->user(),
            $validated['social_account_id'],
            $validated['publish_at'],
            $validated['caption'] ?? null,
            $validated['title'] ?? null,
            $validated['images'],
        );

        return response()->json(['data' => $this->posts->present($schedule)], 201);
    }

    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        try {
            $updated = $this->posts->update(
                $request->user(),
                $schedule,
                $request->validate([
                    'publish_at' => ['sometimes', 'date', 'after:now'],
                    'caption' => ['sometimes', 'nullable', 'string', 'max:5000'],
                    'title' => ['sometimes', 'string', 'max:255'],
                ])
            );
        } catch (ValidationException $e) {
            if (isset($e->errors()['post'])) {
                abort(422, $e->errors()['post'][0]);
            }
            throw $e;
        }

        return response()->json(['data' => $this->posts->present($updated)]);
    }

    public function duplicate(Request $request, Schedule $schedule): JsonResponse
    {
        $validated = $request->validate([
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        $copy = $this->posts->duplicate($request->user(), $schedule, $validated['publish_at']);

        return response()->json(['data' => $this->posts->present($copy)], 201);
    }

    public function destroy(Request $request, Schedule $schedule): JsonResponse
    {
        try {
            $this->posts->delete($request->user(), $schedule);
        } catch (ValidationException $e) {
            if (isset($e->errors()['post'])) {
                abort(422, $e->errors()['post'][0]);
            }
            throw $e;
        }

        return response()->json(null, 204);
    }
}
