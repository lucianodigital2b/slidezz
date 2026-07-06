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
            // Min 1 so a deck with a user-supplied CTA image can ask the model for a
            // single content slide (the image becomes the final slide client-side).
            'slide_count' => ['nullable', 'integer', 'min:1', 'max:10'],
            'word_highlight' => ['nullable', 'boolean'],
            'language' => ['nullable', 'string', 'max:50'],
            'template' => ['nullable', 'string', 'max:100'],
            'image_style' => ['nullable', 'string', 'max:300'],
            'handle' => ['nullable', 'string', 'max:100'],
            'cta_slide' => ['nullable', 'boolean'],
        ]);

        // Soft paywall: signup and browsing are free, but the AI generator needs
        // the lifetime launch offer (or an active subscription).
        if (! $request->user()->hasPremiumAccess()) {
            return response()->json([
                'error' => 'premium_required',
                'message' => 'Ative o acesso vitalício para gerar carrosséis com IA.',
            ], 402);
        }

        try {
            $ndjson = $this->carouselGenerationService->generateSlides(
                topic: $validated['topic'],
                style: $validated['style'] ?? 'modern and professional',
                slideCount: $validated['slide_count'] ?? 5,
                wordHighlight: $validated['word_highlight'] ?? true,
                language: $validated['language'] ?? 'Portuguese (Brazil)',
                template: $validated['template'] ?? '',
                imageStyle: $validated['image_style'] ?? '',
                handle: $validated['handle'] ?? '',
                ctaSlide: $validated['cta_slide'] ?? true,
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

        if (! $request->user()->hasPremiumAccess()) {
            return response()->json([
                'error' => 'premium_required',
                'message' => 'Ative o acesso vitalício para gerar imagens com IA.',
            ], 402);
        }

        // Images are BYOK-only: they always run on the user's own Gemini key,
        // so there is no platform COGS and nothing to meter with credits.
        $byokKey = $request->user()->byokGeminiKey();

        if ($byokKey === null) {
            return response()->json([
                'error' => 'missing_byok_key',
                'message' => 'Conecte sua chave Gemini em Configurações → Integrações para gerar imagens.',
            ], 402);
        }

        try {
            $base64 = $this->carouselGenerationService->generateImage(
                $validated['prompt'],
                $validated['aspect_ratio'] ?? '4:5',
                $byokKey,
            );
        } catch (\Throwable $e) {
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
