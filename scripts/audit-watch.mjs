/**
 * Audits the dependency tree - dev included - and reports every advisory the
 * gate in `.github/workflows/build.yml` is allowed to leave unaddressed.
 *
 * The tree carries one advisory that cannot be fixed from here: GHSA-gcqx-w48m-w2h4
 * (deepmerge 4.3.1, reached through jest 30.5.2 -> @jest/core -> jest-config).
 * 4.3.1 is the newest release, the advisory lists no patched version at any
 * range, and jest-config is at its latest published version - so gating on it
 * would mean a permanently red build. `npm audit fix --force` does not review
 * this either: it downgrades jest 30 -> 25 to escape the chain.
 *
 * An exemption with no expiry is how a one-off becomes permanent, so this script
 * re-checks it and reports when it is out of date:
 *
 *   - an advisory outside EXEMPTIONS appears - the exemption is too narrow
 *   - an EXEMPTIONS advisory no longer appears in the tree - the exemption is dead
 *   - an exempted advisory is reported at a path its entry does not cover - a
 *     second copy arrived through a dependency this entry was not written about
 *   - a WATCHED_FOR_RELEASE package publishes a version newer than the one
 *     recorded here - a fix may now exist, so re-evaluate and drop the exemption
 *   - an EXEMPTIONS id is missing from the build.yml comment - the gate and this
 *     script disagree about what is exempt
 *
 * Any of those exits 1, failing the run and making the workflow file an issue.
 * The known advisory on its own does NOT exit 1: it is expected, and a job that
 * is red every week trains people to ignore red.
 *
 * The `qs` override in package.json belongs to the same argument. It pins 6.17.0
 * to clear GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g and
 * GHSA-6pq8-jhm2-2vcw - all four patched at 6.16.1 - on the single copy in the
 * tree, which arrives through @stryker-mutator/core -> typed-rest-client and is
 * dev-only. Drop the override once that chain resolves qs at 6.16.1 or later on
 * its own; until then the full-tree gate below would report the advisories it
 * closes.
 *
 * Run with `node scripts/audit-watch.mjs`, or `--gate` from the build, which
 * skips the registry check so a new release of a watched package cannot turn a
 * PR red for a reason the branch cannot fix.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUILD_WORKFLOW = path.join('.github', 'workflows', 'build.yml')

/**
 * Advisories the dev-scoped gate in build.yml is allowed to leave unaddressed.
 * Each one must also be named in that workflow's comment - the check below
 * enforces it, so the gate and this list cannot drift apart.
 */
const EXEMPTIONS = [
  {
    id: 'GHSA-gcqx-w48m-w2h4',
    // Both shapes the one copy this entry is about can take: hoisted to the
    // root because nothing else wants a different version, or nested under the
    // package that asks for it. A copy under any other parent is a different
    // dependency's copy and is not covered - the paths are compared exactly for
    // that reason, so npm changing its hoisting fails the gate rather than
    // silently widening the entry.
    paths: [
      'node_modules/deepmerge',
      'node_modules/jest-config/node_modules/deepmerge'
    ],
    reason:
      'deepmerge 4.3.1 allows prototype poisoning through mergeObject(). It sits in the dev tree only, reached through jest 30.5.2 -> @jest/core -> jest-config, which is the newest jest-config published. 4.3.1 is the newest deepmerge and the advisory names no patched version at any range, so nothing in this repo can move it: an `overrides` entry can only pin a version that does not exist. The input to mergeObject() is the jest configuration in this repository, not package data or a request body - but that is why the risk is small, not a reason to keep the advisory out of the report.'
  }
]

/**
 * Packages whose published version decides whether an exemption is still
 * justified. `newestKnown` is the newest release at the time the exemption was
 * written; a newer one on the registry means a fix may exist and the exemption
 * deserves a fresh look rather than another year of silence.
 */
const WATCHED_FOR_RELEASE = [{ name: 'deepmerge', newestKnown: '4.3.1' }]

/**
 * `npm audit --json` exits 1 whenever it reports anything, so the exit code says
 * nothing about whether the command worked - parse the report instead.
 */
const runAudit = () => {
  // A fixture report lets the gate be exercised against shapes the installed
  // tree does not have - a nested copy of an exempted package, an unlisted
  // advisory - without installing one. An argument rather than an environment
  // variable on purpose: the environment of the step that decides the build
  // outcome is inherited from the workflow, so a variable would let a stray `env:`
  // in CI replace the report the gate reads.
  const fixture = process.argv.find((arg) => arg.startsWith('--audit-json='))
  if (fixture) {
    return JSON.parse(readFileSync(fixture.slice('--audit-json='.length), 'utf8'))
  }

  let stdout
  try {
    stdout = execFileSync('npm', ['audit', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch (error) {
    stdout = error.stdout
  }
  if (!stdout || !stdout.trim()) {
    throw new Error('npm audit produced no JSON - run `npm ci` first')
  }
  return JSON.parse(stdout)
}

/**
 * The advisories the report names, keyed by GHSA id. A `via` entry is a bare
 * package name when the advisory is inherited from a dependency, and an object
 * carrying the GHSA url when it is the root of the chain - only the latter are
 * advisories in their own right.
 */
const collectAdvisories = (report) => {
  const advisories = new Map()

  for (const [packageName, info] of Object.entries(report?.vulnerabilities ?? {})) {
    for (const via of info?.via ?? []) {
      if (typeof via !== 'object' || via === null) continue
      const id = String(via.url ?? '').split('/').pop()
      if (!id?.startsWith('GHSA-')) continue

      const entry = advisories.get(id) ?? {
        severity: via.severity,
        title: via.title,
        packages: [],
        paths: []
      }
      entry.packages.push(packageName)
      entry.paths.push(...(info.nodes ?? []))
      advisories.set(id, entry)
    }
  }

  return advisories
}

/** The version the registry currently resolves `latest` to, or null if offline. */
const latestPublished = (name) => {
  try {
    return execFileSync('npm', ['view', name, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return null
  }
}

/**
 * Numeric dotted comparison, so `1.1.10` sorts above `1.1.9`. A prerelease
 * suffix is dropped from both sides first: `1.1.3-beta.1` is not newer than
 * `1.1.3`, and a prerelease that happens to be tagged `latest` must not raise
 * the alarm by itself.
 */
const isNewer = (candidate, baseline) => {
  const a = candidate.split('-')[0].split('.')
  const b = baseline.split('-')[0].split('.')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const left = a[i] ?? '0'
    const right = b[i] ?? '0'
    if (left === right) continue
    const leftNumber = Number(left)
    const rightNumber = Number(right)
    if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
      return left > right
    }
    return leftNumber > rightNumber
  }
  return false
}

/**
 * Write the report to the step summary and to the file the workflow reads.
 * Wrapped so a failure to report cannot mask the failure being reported - and
 * so the workflow's `gh issue create --body-file` always has a file, including
 * on the path below where the watch itself broke.
 */
const writeReport = (summary) => {
  try {
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
    }
    if (process.env.AUDIT_WATCH_REPORT) {
      writeFileSync(process.env.AUDIT_WATCH_REPORT, summary)
    }
  } catch (error) {
    console.error(`could not write the report: ${error.message}`)
  }
}

const main = () => {
  const report = runAudit()
  const advisories = collectAdvisories(report)
  const problems = []

  for (const [id, advisory] of advisories) {
    const exemption = EXEMPTIONS.find((entry) => entry.id === id)
    const where = [...new Set(advisory.paths)].sort().join(', ')

    if (!exemption) {
      problems.push(
        `new advisory ${id} (${advisory.severity}): ${advisory.title} - ` +
          `packages: ${[...new Set(advisory.packages)].sort().join(', ')}, ` +
          `at ${where}. Fix it, or add it to EXEMPTIONS with the path it sits on ` +
          'and name it in the build.yml comment.'
      )
      continue
    }

    // Keyed on the resolution path, not the id: an id alone cannot tell the copy
    // an entry was written about from a second one that arrived through another
    // dependency, and the second would pass under the first one's argument. The
    // path includes the parent, so provenance is part of the claim.
    const strays = [...new Set(advisory.paths)].filter(
      (nodePath) => !exemption.paths.includes(nodePath)
    )
    if (strays.length) {
      problems.push(
        `exempted advisory ${id} is reported at ${strays.join(', ')}, which the ` +
          `entry does not cover (it covers ${exemption.paths.join(', ')}). ` +
          'Either widen the entry with an argument for the new path, or fix it.'
      )
    }
  }

  for (const exemption of EXEMPTIONS) {
    if (advisories.has(exemption.id)) continue
    problems.push(
      `exempted advisory ${exemption.id} no longer appears in the tree - the ` +
        'exemption is dead weight. Remove it from EXEMPTIONS and from the ' +
        'build.yml comment, and restore the full `npm audit` gate.'
    )
  }

  const gate = process.argv.includes('--gate')

  for (const { name, newestKnown } of gate ? [] : WATCHED_FOR_RELEASE) {
    const latest = latestPublished(name)
    if (latest === null) {
      console.log(`skipped the registry check for ${name} - npm view failed`)
      continue
    }
    if (isNewer(latest, newestKnown)) {
      problems.push(
        `${name} has published ${latest}, newer than the ${newestKnown} recorded ` +
          'with the exemption - a fix may exist. Re-evaluate the exemption, bump ' +
          'the chain if it clears, and drop the exemption when it does.'
      )
    }
  }

  const buildWorkflow = readFileSync(path.join(ROOT, BUILD_WORKFLOW), 'utf8')
  for (const exemption of EXEMPTIONS) {
    if (buildWorkflow.includes(exemption.id)) continue
    problems.push(
      `exemption ${exemption.id} is not named in ${BUILD_WORKFLOW} - the gate ` +
        'and this script disagree about what is exempt.'
    )
  }

  const { moderate = 0, high = 0, critical = 0, total = 0 } =
    report?.metadata?.vulnerabilities ?? {}

  const summary = [
    '## Dev-tree audit watch',
    '',
    `Full audit: ${total} vulnerable packages, from ${advisories.size} ` +
      `${advisories.size === 1 ? 'advisory' : 'advisories'} ` +
      `(${critical} critical, ${high} high, ${moderate} moderate).`,
    '',
    '| advisory | severity | packages | exempt |',
    '| --- | --- | --- | --- |',
    ...[...advisories].map(
      ([id, advisory]) =>
        `| ${id} | ${advisory.severity} | ${[...new Set(advisory.packages)].sort().join(', ')} | ` +
        `${EXEMPTIONS.some((entry) => entry.id === id) ? 'yes' : '**no**'} |`
    ),
    '',
    problems.length
      ? ['### The exemption needs attention', '', ...problems.map((p) => `- ${p}`), ''].join('\n')
      : 'The exemption still matches the tree - nothing to do.',
    ''
  ].join('\n')

  console.log(summary)
  writeReport(summary)

  process.exitCode = problems.length ? 1 : 0
}

try {
  main()
} catch (error) {
  // The watch itself broke, so the exemption went unchecked. Say so in the
  // report rather than leaving the workflow to fail on a missing file.
  const summary = [
    '## Dev-tree audit watch',
    '',
    'The watch did not complete, so the dev-tree audit exemption was **not**',
    'checked against the tree. Nothing is known about the advisories right now.',
    '',
    '```',
    error.message,
    '```',
    '',
    'Investigate the failing step, then re-run the workflow.',
    ''
  ].join('\n')

  console.error(`audit watch failed: ${error.message}`)
  writeReport(summary)
  process.exit(1)
}
