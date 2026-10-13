import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

/** Entry point for Remotion's bundler (render.mjs). The Vite app never imports this. */
registerRoot(RemotionRoot);
