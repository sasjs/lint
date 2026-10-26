/**
 * Asserts the contents of the tarball `npm publish` would upload.
 *
 * `files` in package.json names build outputs, none of which exist in a fresh
 * checkout: npm does not fail on an entry that matches nothing, so a renamed or
 * misspelled path publishes a package that is quietly missing that surface, and
 * the first sign of it is a consumer failing to import. This runs after
 * `npm run publishInit` has copied the build output to the package root, and
 * before semantic-release is allowed to publish.
 *
 * Exits 0 when the tarball carries the public API and no development files.
 */
import { execFileSync } from 'child_process'

// Every entry point a consumer can reach, by path.
const REQUIRED = [
  'index.js',
  'index.d.ts',
  'index.js.map',
  'checkNodeVersion.js',
  'sasjslint-schema.json',
  'README.md',
  'LICENSE',
  'formatExample.js',
  'formatExample.d.ts',
  'lintExample.js',
  'lintExample.d.ts',
  'format/index.js',
  'format/formatText.js',
  'lint/index.js',
  'lint/lintText.js',
  'rules/file/index.js',
  'rules/line/index.js',
  'rules/path/index.js',
  'types/index.js',
  'utils/index.js'
]

// Paths a published package must not carry: they are the repo, not the library.
const FORBIDDEN = [
  'src/',
  '.github/',
  '.git-hooks/',
  'scripts/',
  'jest.config.js',
  'jest.stryker.config.js',
  'stryker.conf.json',
  'mutation-baseline.json',
  'tsconfig.json',
  '.prettierrc'
]

const pack = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
)[0]

const paths = pack.files.map((file) => file.path)
const present = new Set(paths)

const missing = REQUIRED.filter((path) => !present.has(path))
const leaked = paths.filter((path) =>
  FORBIDDEN.some((entry) =>
    entry.endsWith('/') ? path.startsWith(entry) : path === entry
  )
)

console.log(`Tarball: ${paths.length} files, ${pack.size} bytes packed`)

if (missing.length) {
  console.error('\nMissing from the tarball (a consumer cannot import these):')
  missing.forEach((path) => console.error(`  ${path}`))
}
if (leaked.length) {
  console.error('\nDevelopment files in the tarball:')
  leaked.forEach((path) => console.error(`  ${path}`))
}

if (missing.length || leaked.length) {
  console.error(
    '\nCheck "files" in package.json against what the build actually emits, and run this after "npm run publishInit".'
  )
  process.exit(1)
}

console.log('Tarball carries the public API and no development files.')
