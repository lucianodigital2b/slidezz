/**
 * Server-side MP4 render for a Slidezz video, driven by App\Services\Rendering\VideoRenderer.
 *
 *   node render.mjs --bundle <outDir>                      Prebuild the composition bundle (deploys).
 *   node render.mjs <props.json> <output.mp4> [bundleDir]  Render. Bundles on the fly without a bundleDir.
 *
 * Progress is written to stdout as `progress:<0-100>` lines.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const COMPOSITION_ID = 'SlidezzVideo';
const entryPoint = join(dirname(fileURLToPath(import.meta.url)), 'index.ts');
const args = process.argv.slice(2);

async function prebuild(outDir) {
    await bundle({ entryPoint, outDir: resolve(outDir) });
    console.log(`bundled:${resolve(outDir)}`);
}

async function render(propsPath, outputPath, bundleDir) {
    const inputProps = JSON.parse(readFileSync(propsPath, 'utf8'));
    const serveUrl = bundleDir && existsSync(join(bundleDir, 'index.html'))
        ? resolve(bundleDir)
        : await bundle({ entryPoint });

    const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps });
    let lastReported = -1;

    await renderMedia({
        composition,
        serveUrl,
        inputProps,
        codec: 'h264',
        outputLocation: resolve(outputPath),
        concurrency: process.env.REMOTION_CONCURRENCY ? Number(process.env.REMOTION_CONCURRENCY) : null,
        // Clip media lives on the media disk (R2/CDN), a different origin than the bundle.
        chromiumOptions: { disableWebSecurity: true },
        onProgress: ({ progress }) => {
            const percent = Math.floor(progress * 100);

            if (percent !== lastReported) {
                lastReported = percent;
                console.log(`progress:${percent}`);
            }
        },
    });
}

try {
    if (args[0] === '--bundle') {
        await prebuild(args[1]);
    } else if (args.length >= 2) {
        await render(args[0], args[1], args[2]);
    } else {
        throw new Error('Usage: node render.mjs <props.json> <output.mp4> [bundleDir] | --bundle <outDir>');
    }
} catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
}
