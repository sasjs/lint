#!/usr/bin/env node
/**
 * A strict dependency audit.
 *
 * `npm audit` fails on ANY advisory, which cannot pass in this repo: the
 * advisories below sit inside the `npm` package that `@semantic-release/npm`
 * depends on, in its bundled tree, where no `overrides` entry can reach them.
 * npm 12.1.0 bundles the same versions as 11.20.0, so no upgrade clears them.
 * They are unreachable from this package's own code and its runtime
 * dependencies.
 *
 * Lowering the threshold for everything would hide a new advisory anywhere
 * else, so instead they are named below and every other advisory fails the
 * build - including one of the same severity. If one disappears upstream, this
 * script says so, so the exemption does not outlive its reason.
 *
 * Run with `npm run audit`.
 */
import { execFileSync } from 'node:child_process'

/**
 * Advisories that cannot be fixed from this repo, and why.
 */
const EXEMPT = new Map([
  ['GHSA-rpw4-54j3-4h4q', 'ip-address, inside the npm package bundled by @semantic-release/npm'],
  ['GHSA-2vr4-cq9g-pvrc', 'ip-address, inside the npm package bundled by @semantic-release/npm'],
  ['GHSA-3wwx-pv8p-q78v', 'undici, inside the npm package bundled by @semantic-release/npm'],
  // The advisories below landed upstream after the exemptions above were
  // written, against the same bundled copies. npm 12.1.0 bundles identical
  // versions of all three packages, so an upgrade clears none of them.
  ['GHSA-j6r3-76f7-8jcv', 'ip-address, inside the npm package bundled by @semantic-release/npm'],
  ['GHSA-h3mg-xc3c-68pw', 'ip-address, inside the npm package bundled by @semantic-release/npm'],
  ['GHSA-r53p-7pc4-xj5r', 'undici, inside the npm package bundled by @semantic-release/npm'],
  ['GHSA-rfgv-xxqx-mfg5', 'undici, inside the npm package bundled by @semantic-release/npm'],
  [
    'GHSA-q2hr-2g5m-vwhr',
    'brace-expansion, inside the npm package bundled by @semantic-release/npm'
  ],
  [
    'GHSA-qhr7-859c-m2p7',
    'brace-expansion, inside the npm package bundled by @semantic-release/npm'
  ],
  [
    'GHSA-6j4f-fj2g-mc7p',
    'brace-expansion, inside the npm package bundled by @semantic-release/npm'
  ]
])

const run = () => {
  try {
    return execFileSync('npm', ['audit', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch (error) {
    // npm audit exits non-zero when it finds anything, which is the case we are
    // here to read, so the report on stdout is the payload either way.
    if (error.stdout) return error.stdout
    throw error
  }
}

let report
try {
  report = JSON.parse(run())
} catch {
  console.error('could not read the npm audit report')
  process.exit(1)
}

const ghsaOf = (via) => {
  if (typeof via === 'string') return undefined
  const match = /GHSA-[a-z0-9-]+/i.exec(via?.url ?? '')
  return match ? match[0] : undefined
}

const found = new Map()
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    const id = ghsaOf(via)
    if (!id) continue
    if (!found.has(id)) {
      found.set(id, {
        id,
        title: via.title ?? '',
        severity: via.severity ?? vulnerability.severity,
        packages: new Set()
      })
    }
    found.get(id).packages.add(vulnerability.name)
  }
}

const exempt = [...found.keys()].filter((id) => EXEMPT.has(id))
const failing = [...found.values()].filter((entry) => !EXEMPT.has(entry.id))
const stale = [...EXEMPT.keys()].filter((id) => !found.has(id))

console.log(`advisories found: ${found.size}`)
for (const entry of found.values()) {
  const mark = EXEMPT.has(entry.id) ? 'exempt' : 'FAIL  '
  console.log(
    `  ${mark} ${entry.severity.padEnd(8)} ${entry.id}  ${[...entry.packages].join(', ')}`
  )
}

for (const id of stale) {
  console.log(`  GONE    ${id}  no longer reported - remove its exemption`)
}

if (failing.length === 0 && stale.length === 0) {
  console.log(
    `audit clean: ${exempt.length} exempt, ${stale.length} stale, ${failing.length} failing`
  )
  process.exit(0)
}

if (stale.length > 0) {
  console.error(
    `${stale.length} exemption(s) no longer match a reported advisory.`
  )
}

if (failing.length > 0) {
  console.error(`${failing.length} advisory(ies) are NOT exempt:`)
  for (const entry of failing) {
    console.error(`  ${entry.severity} ${entry.id} ${entry.title}`)
    console.error(`    ${[...entry.packages].join(', ')}`)
  }
}

process.exit(1)
