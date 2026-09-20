import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { buildCountriesMarkdown, buildSitemapXml } from './src/next/lib/sitemap'

function writeSiteDiscoveryFiles(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'robots.txt'), fs.readFileSync(path.resolve(__dirname, 'public/robots.txt')))
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), buildSitemapXml())
  fs.writeFileSync(path.join(dir, 'countries.md'), buildCountriesMarkdown())
}

function siteDiscovery(): Plugin {
  return {
    name: 'site-discovery',
    buildStart() {
      writeSiteDiscoveryFiles(path.resolve(__dirname, 'public'))
    },
    closeBundle() {
      writeSiteDiscoveryFiles(path.resolve(__dirname, 'dist'))
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    siteDiscovery(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'https://stabletracker.org',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
