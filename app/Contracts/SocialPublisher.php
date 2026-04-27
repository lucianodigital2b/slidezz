<?php

namespace App\Contracts;

use App\Models\ContentProject;
use App\Models\SocialAccount;

interface SocialPublisher
{
    /**
     * Return the OAuth URL for the user to authenticate.
     */
    public function authenticate(): string;

    /**
     * Handle the OAuth callback and return the populated SocialAccount model.
     */
    public function handleCallback(array $data): SocialAccount;

    /**
     * Publish the given content project.
     * Returns the platform's specific Post ID.
     */
    public function publish(ContentProject $project): string;

    /**
     * Fetch the latest analytics for a given post.
     */
    public function getAnalytics(string $platformPostId): array;
}
