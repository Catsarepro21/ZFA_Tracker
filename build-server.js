import { build } from 'esbuild';

build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['express', 'googleapis', 'zod'],
  outdir: 'dist',
}).catch(() => process.exit(1));
