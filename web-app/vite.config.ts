import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import packageJson from './package.json'
const host = process.env.TAURI_DEV_HOST

// Plugin to remove GA placeholder (analytics disabled in fork)
function injectGoogleAnalytics(): Plugin {
  return {
    name: 'inject-google-analytics',
    transformIndexHtml(html) {
      return html.replace(/\s*<!-- INJECT_GOOGLE_ANALYTICS -->\n?/g, '')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      TanStackRouterVite({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: '.((test).ts)|test-page',
      }),
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['path'],
      }),
      injectGoogleAnalytics(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@janhq/assistant-extension': path.resolve(__dirname, '../extensions/assistant-extension/dist/index.js'),
        '@janhq/conversational-extension': path.resolve(__dirname, '../extensions/conversational-extension/dist/index.js'),
        '@janhq/download-extension': path.resolve(__dirname, '../extensions/download-extension/dist/index.js'),
        '@janhq/llamacpp-extension': path.resolve(__dirname, '../extensions/llamacpp-extension/dist/index.js'),
        '@janhq/rag-extension': path.resolve(__dirname, '../extensions/rag-extension/dist/index.js'),
        '@janhq/vector-db-extension': path.resolve(__dirname, '../extensions/vector-db-extension/dist/index.js'),
      },
    },
    optimizeDeps: {
      // Extensions are prebuilt, self-contained ESM dist bundles. Excluding them
      // stops Vite's dev dep-optimizer from crawling/re-bundling them mid-boot,
      // which otherwise invalidates the in-flight dynamic import of the service
      // hub and surfaces as "Importing a module script failed" on cold start.
      exclude: [
        '@janhq/assistant-extension',
        '@janhq/conversational-extension',
        '@janhq/download-extension',
        '@janhq/llamacpp-extension',
        '@janhq/rag-extension',
        '@janhq/vector-db-extension',
      ],
    },
    define: {
      IS_TAURI: JSON.stringify(process.env.IS_TAURI),
      IS_DEV: JSON.stringify(process.env.IS_DEV),
      IS_WEB_APP: JSON.stringify(false),
      IS_MACOS: JSON.stringify(
        process.env.TAURI_ENV_PLATFORM?.includes('darwin') ?? false
      ),
      IS_WINDOWS: JSON.stringify(
        process.env.TAURI_ENV_PLATFORM?.includes('windows') ?? false
      ),
      IS_LINUX: JSON.stringify(
        process.env.TAURI_ENV_PLATFORM?.includes('linux') ?? false
      ),
      IS_IOS: JSON.stringify(
        process.env.TAURI_ENV_PLATFORM?.includes('ios') ?? false
      ),
      IS_ANDROID: JSON.stringify(
        process.env.TAURI_ENV_PLATFORM?.includes('android') ?? false
      ),
      PLATFORM: JSON.stringify(process.env.TAURI_ENV_PLATFORM),

      VERSION: JSON.stringify(packageJson.version),

      POSTHOG_KEY: JSON.stringify(''),
      POSTHOG_HOST: JSON.stringify(''),
      GA_MEASUREMENT_ID: JSON.stringify(''),
      MODEL_CATALOG_URL: JSON.stringify(
        env.MODEL_CATALOG_URL ||
          'https://fastly.jsdelivr.net/gh/janhq/model-catalog@main/model_catalog_v2.json'
      ),
      LATEST_JAN_MODEL_URL: JSON.stringify(
        env.LATEST_JAN_MODEL_URL ||
          'https://fastly.jsdelivr.net/gh/janhq/model-catalog@main/latest_jan_model.json'
      ),
      // Base for direct HuggingFace API calls made from the webview (Hub search,
      // token validation). These do NOT go through the Rust download mirror, so
      // in regions where huggingface.co is unreachable this must be pointed at a
      // mirror such as https://hf-mirror.com. No trailing slash.
      HF_API_BASE_URL: JSON.stringify(
        (env.HF_API_BASE_URL || 'https://huggingface.co').replace(/\/+$/, '')
      ),
      AUTO_UPDATER_DISABLED: JSON.stringify(true),
      UPDATE_CHECK_INTERVAL_MS: JSON.stringify(
        Number(env.UPDATE_CHECK_INTERVAL_MS) || 60 * 60 * 1000
      ),
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ['**/src-tauri/**'],
        usePolling: true
      },
    },
  }
})
