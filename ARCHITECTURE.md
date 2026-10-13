# Slidezz - AI Social Media Scheduler Architecture & Plan

## 1. Overview
Slidezz is an AI-driven automation platform for generating, scheduling, and publishing short-form video content (TikToks, Instagram Reels, YouTube Shorts). The platform focuses on high-volume, quick-turnaround User Generated Content (UGC), slideshows, and memes.

## 2. Core Architecture Principles
*   **Agnostic Backend Design:** The system will use the **Strategy Design Pattern** for social media integrations, AI generators, and video renderers. This ensures that while TikTok is the first focus, adding Instagram, YouTube, or new AI models requires zero core logic changes.
*   **Asynchronous Processing:** Video generation and API publishing are slow. The platform will heavily rely on Laravel Queues (Redis/RabbitMQ).
*   **Multi-Tenant Setup:** Workspaces/Brands to group social accounts, media assets, and team members.
*   **Tech Stack:** 
    *   Backend: Laravel 13 (PHP 8.3+)
    *   Frontend: React + Inertia.js + Tailwind CSS
    *   Database: PostgreSQL/MySQL (agnostic schema)
    *   Queue: Redis

## 3. Database Schema (Core Entities)

### `workspaces` (Multi-tenancy)
- `id`, `name`, `owner_id`, `created_at`, `updated_at`

### `social_accounts` (Agnostic Connections)
- `id`, `workspace_id`, `provider` (tiktok, instagram, youtube), `provider_id`, `handle`, `avatar`, `access_token`, `refresh_token`, `expires_at`

### `assets` (Raw Media & Hooks)
- `id`, `workspace_id`, `type` (image, video, audio, avatar), `url`, `metadata` (JSON for transcriptions/tags)

### `content_projects` (The Video Drafts)
- `id`, `workspace_id`, `title`, `type` (slideshow, hook_demo, meme), `status` (drafting, generating, ready, failed), `script_data` (JSON), `video_url`

### `schedules` (The Publishing Engine)
- `id`, `content_project_id`, `social_account_id`, `publish_at`, `status` (pending, publishing, published, failed), `platform_post_id`, `error_log`

## 4. Agnostic Backend Implementation

### A. The Publishing Interface
```php
interface SocialPublisher {
    public function authenticate(): string;
    public function handleCallback(array $data): SocialAccount;
    public function publish(ContentProject $project): string; // returns Platform Post ID
    public function getAnalytics(string $platformPostId): array;
}
```
*Implementations: `TikTokPublisher`, `InstagramPublisher`, `YouTubePublisher`*

### B. The AI Generation Interface
```php
interface VideoGenerator {
    public function generateSlideshow(array $images, string $audio, array $script): string;
    public function generateHookDemo(string $hookVideo, string $demoVideo): string;
}
```
*Implementations: `LocalFFmpegGenerator`, `CloudRenderApiGenerator`*

## 5. Implementation Phases

### Phase 1: Foundation & Data Models
- [ ] Scaffold `Workspace`, `SocialAccount`, `ContentProject`, and `Schedule` models/migrations.
- [ ] Set up the UI for the Dashboard (React/Inertia).
- [ ] Implement the `SocialPublisher` interface.

### Phase 2: TikTok Integration (The "First" Focus)
- [ ] Implement `TikTokPublisher` using TikTok's Content Posting API.
- [ ] Build the OAuth flow for users to connect their TikTok accounts.
- [ ] Create a basic scheduling Queue Worker to dispatch posts at `publish_at`.

### Phase 3: AI Content Engine
- [ ] Integrate OpenAI/Gemini for script generation.
- [ ] Integrate ElevenLabs/OpenAI TTS for voiceovers.
- [ ] Build the Slideshow & Hook+Demo assembly logic (FFmpeg or a 3rd party API like Creatomate/Shotstack).

### Phase 4: UI/UX & Bulk Scheduling
- [ ] Build the Content Calendar view.
- [ ] Build the "Generate" wizard (Topic -> Script -> Voice -> Video).
- [ ] Implement Bulk Upload & Schedule flows.

### Phase 5: Analytics & Scale
- [ ] Fetch views/likes via Social APIs and display in a dashboard.
- [ ] Implement webhook listeners for async video generation callbacks.
