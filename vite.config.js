import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {viteSingleFile} from 'vite-plugin-singlefile';
export default defineConfig({plugins:[viteSingleFile()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},esbuild:{jsx:'automatic'},build:{rollupOptions:{output:{inlineDynamicImports:true}}}});
