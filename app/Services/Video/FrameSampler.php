<?php

namespace App\Services\Video;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

/**
 * Samples a video into a few contact sheets (2x2 frames, each stamped with its timestamp) for a
 * vision model. Sheets instead of single frames because the Groq vision models take at most 3 images.
 */
class FrameSampler
{
    private const FRAMES_PER_SHEET = 4;

    /** Relative to base_path(): drawtext's fontfile breaks on a Windows drive colon. */
    private const LABEL_FONT = 'public/fonts/tiktok/TikTokSans-Black.ttf';

    /**
     * @return array{dir: string, sheets: list<string>, times: list<float>}
     */
    public function contactSheets(string $videoPath, float $duration, int $sheetCount = 3): array
    {
        $dir = sys_get_temp_dir().'/slidezz-frames-'.Str::uuid();
        File::ensureDirectoryExists($dir);

        $frameCount = $sheetCount * self::FRAMES_PER_SHEET;
        $interval = max(1.0, $duration / $frameCount);
        $times = [];

        for ($index = 0; $index < $frameCount; $index++) {
            $time = round($interval / 2 + $index * $interval, 1);

            if ($time >= $duration) {
                break;
            }

            $label = number_format($time, 1, '.', '').' s';
            $output = sprintf('%s/f%02d.jpg', $dir, count($times) + 1);
            $result = Process::path(base_path())->timeout(60)->run([
                config('services.ffmpeg.binary', 'ffmpeg'),
                '-y', '-ss', sprintf('%.2f', $time), '-i', $videoPath, '-frames:v', '1',
                '-vf', 'scale=360:-2,drawtext=fontfile='.self::LABEL_FONT.":text='{$label}':x=10:y=10:fontsize=30:fontcolor=yellow:box=1:boxcolor=black@0.7:boxborderw=6",
                '-q:v', '4', $output,
            ]);

            if ($result->successful() && is_file($output)) {
                $times[] = $time;
            }
        }

        $sheets = [];

        for ($start = 1; $start <= count($times); $start += self::FRAMES_PER_SHEET) {
            $sheet = sprintf('%s/sheet%d.jpg', $dir, count($sheets) + 1);
            $result = Process::path(base_path())->timeout(60)->run([
                config('services.ffmpeg.binary', 'ffmpeg'),
                '-y', '-start_number', (string) $start, '-i', "{$dir}/f%02d.jpg",
                '-vf', 'tile=2x2:padding=6', '-frames:v', '1', '-q:v', '4', $sheet,
            ]);

            if ($result->successful() && is_file($sheet)) {
                $sheets[] = $sheet;
            }
        }

        return ['dir' => $dir, 'sheets' => $sheets, 'times' => $times];
    }

    /**
     * @param  array{dir: string}|null  $sample
     */
    public function cleanup(?array $sample): void
    {
        if ($sample && is_dir($sample['dir'])) {
            File::deleteDirectory($sample['dir']);
        }
    }
}
