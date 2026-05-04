<?php

namespace App\Http\Controllers;

use App\Services\AI\CarouselGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CarouselGenerationController extends Controller
{
    public function __construct(private readonly CarouselGenerationService $carouselGenerationService) {}

    public function generate(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'style' => ['nullable', 'string', 'max:200'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:10'],
        ]);

        return $this->carouselGenerationService->generateSlides(
            topic: $validated['topic'],
            style: $validated['style'] ?? 'modern and professional',
            slideCount: $validated['slide_count'] ?? 5,
        );
    }

    public function generateImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:4000'],
        ]);

        try {
            $base64 = $this->carouselGenerationService->generateImage($validated['prompt']);
        } catch (\RuntimeException) {
            return response()->json(['error' => 'Image generation failed'], 500);
        }

        return response()->json(['base64' => $base64]);
    }
}
