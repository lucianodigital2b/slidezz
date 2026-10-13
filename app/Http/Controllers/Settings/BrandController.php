<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Show the brand profile settings (the data collected during onboarding).
     */
    public function edit(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $profile = $workspace?->profile ?? [];
        $logoPath = $workspace?->logo_path ?? data_get($profile, 'logo_path');

        return Inertia::render('settings/brand', [
            'profile' => [
                'goal' => data_get($profile, 'goal', ''),
                'brand_name' => data_get($profile, 'brand_name', $workspace?->name ?? ''),
                'brand_description' => data_get($profile, 'brand_description', ''),
                'target_audience' => data_get($profile, 'target_audience', ''),
                'tone_of_voice' => data_get($profile, 'tone_of_voice', []),
                'palette' => data_get($profile, 'palette'),
                'visual_style' => data_get($profile, 'visual_style', ''),
            ],
            'logoUrl' => $logoPath ? Storage::url($logoPath) : null,
        ]);
    }

    /**
     * Update the brand profile. Mirrors the onboarding profile step, minus the
     * plan/BYOK bits (those live on their own settings pages).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'goal' => ['required', 'string', 'max:100'],
            'brand_name' => ['required', 'string', 'max:200'],
            'brand_description' => ['required', 'string', 'max:1000'],
            'target_audience' => ['required', 'string', 'max:1000'],
            'tone_of_voice' => ['required', 'array', 'min:1'],
            'tone_of_voice.*' => ['string', 'max:50'],
            'palette' => ['required', 'array'],
            'palette.name' => ['required', 'string', 'max:100'],
            'palette.primary' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'palette.secondary' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'palette.accent' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'visual_style' => ['nullable', 'string', 'max:2000'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $workspace = Workspace::firstOrNew(['owner_id' => $request->user()->id]);
        $profile = $workspace->profile ?? [];

        $profile = array_merge($profile, [
            'goal' => $validated['goal'],
            'brand_name' => $validated['brand_name'],
            'brand_description' => $validated['brand_description'],
            'target_audience' => $validated['target_audience'],
            'tone_of_voice' => $validated['tone_of_voice'],
            'palette' => $validated['palette'],
            'visual_style' => $validated['visual_style'] ?? null,
        ]);

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
            $profile['logo_path'] = $logoPath;
            $workspace->logo_path = $logoPath;
        }

        $workspace->name = $validated['brand_name'];
        $workspace->profile = $profile;
        $workspace->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Marca atualizada.')]);

        return to_route('brand.edit');
    }
}
