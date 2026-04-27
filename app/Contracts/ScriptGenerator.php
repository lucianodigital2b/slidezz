<?php

namespace App\Contracts;

interface ScriptGenerator
{
    /**
     * Generate a video script for a specific topic and format.
     */
    public function generate(string $topic, string $format = 'tiktok'): array;
}