<?php

namespace Tests\Feature;

use App\Models\SlideProject;
use App\Models\SlideTemplate;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlideTemplateControllerTest extends TestCase
{
    use RefreshDatabase;

    private function userWithWorkspace(): array
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        return [$user, $workspace];
    }

    private function sampleSlides(): array
    {
        return [['id' => 's1', 'background' => '#000000', 'elements' => []]];
    }

    public function test_store_requires_authentication(): void
    {
        $this->postJson(route('slide-templates.store'), [])->assertUnauthorized();
    }

    public function test_it_saves_the_current_slides_as_a_template(): void
    {
        [$user, $workspace] = $this->userWithWorkspace();

        $this->actingAs($user)
            ->postJson(route('slide-templates.store'), [
                'title' => 'Meu Template',
                'format' => 'post',
                'slides' => $this->sampleSlides(),
                'thumbnail' => 'data:image/jpeg;base64,abc',
            ])
            ->assertOk()
            ->assertJsonStructure(['id']);

        $this->assertDatabaseHas('slide_templates', [
            'workspace_id' => $workspace->id,
            'title' => 'Meu Template',
            'format' => 'post',
        ]);
    }

    public function test_store_validates_slides_are_present(): void
    {
        [$user] = $this->userWithWorkspace();

        $this->actingAs($user)
            ->postJson(route('slide-templates.store'), [
                'title' => 'Sem slides',
                'format' => 'post',
                'slides' => [],
            ])
            ->assertJsonValidationErrors('slides');
    }

    public function test_index_lists_only_the_workspace_templates_without_slides(): void
    {
        [$user, $workspace] = $this->userWithWorkspace();
        SlideTemplate::create([
            'workspace_id' => $workspace->id,
            'title' => 'T1',
            'format' => 'post',
            'slides' => $this->sampleSlides(),
        ]);

        $otherWorkspace = Workspace::factory()->create(['owner_id' => User::factory()->create()->id]);
        SlideTemplate::create([
            'workspace_id' => $otherWorkspace->id,
            'title' => 'Alheio',
            'format' => 'post',
            'slides' => $this->sampleSlides(),
        ]);

        $this->actingAs($user)
            ->getJson(route('slide-templates.index'))
            ->assertOk()
            ->assertJsonCount(1, 'templates')
            ->assertJsonPath('templates.0.title', 'T1')
            ->assertJsonMissingPath('templates.0.slides');
    }

    public function test_use_clones_template_into_a_new_project_and_opens_the_editor(): void
    {
        [$user, $workspace] = $this->userWithWorkspace();
        $template = SlideTemplate::create([
            'workspace_id' => $workspace->id,
            'title' => 'Base',
            'format' => 'stories',
            'slides' => $this->sampleSlides(),
        ]);

        $response = $this->actingAs($user)->post(route('slide-templates.use', $template));

        $project = SlideProject::where('workspace_id', $workspace->id)->firstOrFail();

        $response->assertRedirectToRoute('slideshow-editor.edit', $project);
        $this->assertSame('Base', $project->title);
        $this->assertSame('stories', $project->format);
        $this->assertEquals($template->slides, $project->slides);
    }

    public function test_cannot_use_a_template_from_another_workspace(): void
    {
        [$user] = $this->userWithWorkspace();
        $otherWorkspace = Workspace::factory()->create(['owner_id' => User::factory()->create()->id]);
        $foreign = SlideTemplate::create([
            'workspace_id' => $otherWorkspace->id,
            'title' => 'Alheio',
            'format' => 'post',
            'slides' => $this->sampleSlides(),
        ]);

        $this->actingAs($user)
            ->post(route('slide-templates.use', $foreign))
            ->assertForbidden();
    }
}
