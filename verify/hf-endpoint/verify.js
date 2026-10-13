// Mirrors web-app/src/lib/hfEndpoint.ts resolution logic.
// Run: node verify-hf-endpoint.js
function resolve(declared, value) {
  try {
    if (declared && typeof value === 'string' && value.length > 0) {
      return value.replace(/\/+$/, '')
    }
  } catch {}
  return 'https://huggingface.co'
}
const hfApiUrl = (base, path) =>
  `${base}${path.startsWith('/') ? path : '/' + path}`

const cases = [
  ['build with mirror',        resolve(true,  'https://hf-mirror.com'),      'https://hf-mirror.com'],
  ['mirror with slash',        resolve(true,  'https://hf-mirror.com/'),     'https://hf-mirror.com'],
  ['mirror with 3 slashes',    resolve(true,  'https://hf-mirror.com///'),   'https://hf-mirror.com'],
  ['global undefined',         resolve(true,  undefined),                    'https://huggingface.co'],
  ['empty string',             resolve(true,  ''),                           'https://huggingface.co'],
  ['global never declared',    resolve(false, undefined),                    'https://huggingface.co'],
]

let fail = 0
console.log('=== HF_API_BASE resolution ===')
for (const [label, got, want] of cases) {
  const ok = got === want
  if (!ok) fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(24)} -> ${got}`)
}

console.log('')
console.log('=== generated API urls ===')
const base = resolve(true, 'https://hf-mirror.com/')
for (const p of ['/api/models/org/repo?blobs=true&files_metadata=true', '/api/whoami-v2', '/api/models?search=llama']) {
  console.log(`  ${hfApiUrl(base, p)}`)
}

const expect = 'https://hf-mirror.com/api/whoami-v2'
if (hfApiUrl(base, '/api/whoami-v2') !== expect) { fail++; console.log('  FAIL whoami url') }
if (hfApiUrl('https://huggingface.co', 'api/x') !== 'https://huggingface.co/api/x') { fail++; console.log('  FAIL missing-slash path') }

console.log('')
console.log(fail === 0 ? 'ALL PASS' : `${fail} FAILURES`)
process.exit(fail === 0 ? 0 : 1)
