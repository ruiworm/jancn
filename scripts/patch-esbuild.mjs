import fs from 'node:fs'

const targets = [
  'node_modules/esbuild/lib/main.js',
  'web-app/node_modules/esbuild/lib/main.js',
]

for (const target of targets) {
  if (fs.existsSync(target)) {
    const content = fs.readFileSync(target, 'utf8')
    if (content.includes('input.length > 1024 * 1024')) {
      fs.writeFileSync(
        target,
        content.replace(
          'input.length > 1024 * 1024',
          'input.length > 64 * 1024 * 1024'
        ),
        'utf8'
      )
    }
  }
}
