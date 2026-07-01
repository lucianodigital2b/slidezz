<?php

namespace App\Http\Controllers;

use App\Services\AI\CarouselGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CarouselGenerationController extends Controller
{
    public function __construct(private readonly CarouselGenerationService $carouselGenerationService) {}

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'style' => ['nullable', 'string', 'max:200'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:10'],
            'word_highlight' => ['nullable', 'boolean'],
            'language' => ['nullable', 'string', 'max:50'],
            'template' => ['nullable', 'string', 'max:100'],
            'image_style' => ['nullable', 'string', 'max:300'],
        ]);

        // Carousels (text) are unlimited and free: credits meter the only real COGS,
        // which is AI image generation (charged per image in generateImage). So the
        // text step neither gates on nor deducts credits.
        try {
            $ndjson = $this->carouselGenerationService->generateSlides(
                topic: $validated['topic'],
                style: $validated['style'] ?? 'modern and professional',
                slideCount: $validated['slide_count'] ?? 5,
                wordHighlight: $validated['word_highlight'] ?? true,
                language: $validated['language'] ?? 'Portuguese (Brazil)',
                template: $validated['template'] ?? '',
                imageStyle: $validated['image_style'] ?? '',
            );
        } catch (\Throwable $e) {
            \Log::error('Carousel generation failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);

            return response()->json([
                'error' => 'generation_failed',
                'message' => 'Não foi possível gerar o carrossel. Tente novamente.',
            ], 503);
        }

        return response()->json(['ndjson' => $ndjson]);
    }

    public function generateImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:4000'],
            'aspect_ratio' => ['nullable', 'string', 'in:1:1,4:5,9:16,3:4,16:9'],
        ]);

        // A credit is spent only when the PLATFORM pays for the image. With BYOK the
        // user's own Gemini key is billed, so those images are free and unmetered.
        $byokKey = $request->user()->byokGeminiKey();
        $managed = $byokKey === null;

        if ($managed && ! $request->user()->deductCredit()) {
            return response()->json([
                'error' => 'no_credits',
                'message' => 'Imagens virais insuficientes.',
            ], 402);
        }

        try {
            $base64 = $this->carouselGenerationService->generateImage(
                $validated['prompt'],
                $validated['aspect_ratio'] ?? '4:5',
                $byokKey,
            );
        } catch (\Throwable $e) {
            // Refund the credit we spent up front for this managed image.
            if ($managed) {
                $request->user()->addCredits(1);
            }

            \Log::error('Image generation failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'prompt' => $validated['prompt'],
            ]);

            return response()->json(['error' => 'Image generation failed', 'detail' => $e->getMessage()], 500);
        }

        return response()->json(['base64' => $base64]);
    }
}
