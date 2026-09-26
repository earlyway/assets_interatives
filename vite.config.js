import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

const root = process.cwd()
const assetsDir = path.join(root, 'assets')

export default defineConfig({
  server: {
    port: 5180,
    strictPort: true,
    watch: { ignored: ['**/assets/**'] },
  },
  plugins: [
    {
      name: 'serve-assets',
      configureServer(server) {
        server.middlewares.use('/assets', (req, res, next) => {
          const rel = decodeURIComponent((req.url || '/').split('?')[0])
          const file = path.normalize(path.join(assetsDir, rel))
          if (!file.startsWith(assetsDir)) return next()
          if (!existsSync(file) || statSync(file).isDirectory()) return next()
          const stat = statSync(file)
          res.setHeader('Content-Type', 'model/gltf-binary')
          res.setHeader('Content-Length', stat.size)
          createReadStream(file).pipe(res)
        })
      },
      closeBundle() {
        cpSync(assetsDir, path.join(root, 'dist', 'assets'), { recursive: true })
      },
    },
  ],
})
