<?php

namespace App\Contracts;

use App\Models\ContentProject;

interface VideoGenerator
{
    /**
     * Assemble images, audio, and script data into a final video.
     * Returns the local path or URL to the generated video.
     */
    public function render(ContentProject $project): string;
}