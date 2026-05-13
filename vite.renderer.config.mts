import vue from '@vitejs/plugin-vue'
import { join, resolve } from 'path'
import autoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver, NaiveUiResolver, VarletUIResolver } from 'unplugin-vue-components/resolvers'
import components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import pkg from './package.json' with { type: 'json' }
import { createSvgIconsPlugin } from './vite.plugin.icon.mjs'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    license: true,
  },
  plugins: [
    vue(),
    components({
      resolvers: [
        VarletUIResolver(),
        ElementPlusResolver(),
        NaiveUiResolver(),
      ],
    }),
    autoImport({
      resolvers: [
        VarletUIResolver(),
        ElementPlusResolver(),
        NaiveUiResolver(),
      ],
    }),
    createSvgIconsPlugin({
      iconDirs: [ join(process.cwd(), 'svg-icons') ],
      symbolId: 'symbol-[dir]-[name]',
      domId: 'svg-icons-dom',
    }),
    createHtmlPlugin({
      inject: {
        data: {
          name: `${ pkg.productName }`,
          version: `v${ pkg.version }`,
        },
      },
    }),
  ],
})
