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
 * The listing is read from the archive rather than from npm's console output:
 * `npm pack --dry-run --json` answered an empty array on a runner's npm while
 * the same flags worked locally, and a gate that depends on how a tool formats
 * its output fails for the wrong reason.
 *
 * Requires `tar` on PATH (GNU tar or bsdtar), which the Linux runners carry.
 *
 * Exits 0 when the tarball carries the public API and no development files.
 */
import { execFileSync, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

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

const fail = (...lines) => {
  lines.forEach((line) => console.error(line))
  process.exit(1)
}

// `tar` is the only reader of the archive, so its absence is reported as itself
// rather than as a failure to read a tarball that was produced fine.
if (spawnSync('tar', ['--version'], { stdio: 'ignore' }).status !== 0)
  fail(
    'The `tar` command is not available, so the tarball cannot be listed.',
    'Install GNU tar or bsdtar wherever this runs.'
  )

// A per-run directory rather than a fixed filename: two runs for the same version
// overlapping would otherwise read and delete each other's archive.
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasjs-lint-pack-'))

let archive = null
let listing = null

try {
  execFileSync(
    'npm',
    ['pack', '--pack-destination', packDir, '--ignore-scripts'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )
  archive =
    fs.readdirSync(packDir).find((file) => file.endsWith('.tgz')) || null
} catch (error) {
  fs.rmSync(packDir, { recursive: true, force: true })
  fail(
    'npm pack failed, so the tarball could not be inspected.',
    String(error.stdout || '').slice(0, 500),
    String(error.stderr || '').slice(0, 500)
  )
}

if (archive) {
  try {
    listing = execFileSync('tar', ['-tzf', path.join(packDir, archive)], {
      encoding: 'utf8'
    })
  } catch (error) {
    listing = null
    console.error(`Could not list ${archive} with tar.`)
    console.error(String(error.stderr || error.message).slice(0, 500))
  }
}

fs.rmSync(packDir, { recursive: true, force: true })

if (!archive) fail(`npm pack produced no archive in ${packDir}`)
if (listing === null) fail('The tarball was produced but could not be read.')

const paths = listing
  .split('\n')
  .map((line) => line.trim().replace(/^package\//, ''))
  .filter((line) => line && !line.endsWith('/'))

const present = new Set(paths)
const missing = REQUIRED.filter((entry) => !present.has(entry))
const leaked = paths.filter((entry) =>
  FORBIDDEN.some((forbidden) =>
    forbidden.endsWith('/') ? entry.startsWith(forbidden) : entry === forbidden
  )
)

console.log(`Tarball: ${paths.length} files`)

if (missing.length) {
  console.error('\nMissing from the tarball (a consumer cannot import these):')
  missing.forEach((entry) => console.error(`  ${entry}`))
}
if (leaked.length) {
  console.error('\nDevelopment files in the tarball:')
  leaked.forEach((entry) => console.error(`  ${entry}`))
}

if (missing.length || leaked.length) {
  fail(
    '\nCheck "files" in package.json against what the build actually emits, and run this after "npm run publishInit".'
  )
}

console.log('Tarball carries the public API and no development files.')
