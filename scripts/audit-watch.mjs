/**
 * Watches the dev-tree audit exemption declared in `.github/workflows/build.yml`.
 *
 * That workflow gates on `npm audit --omit=dev` because the dev tree carries one
 * advisory nothing in this repo can fix: GHSA-hp3w-g68c-fv3c (sprintf-js,
 * reached through @jest/transform -> babel-plugin-istanbul ->
 * @istanbuljs/load-nyc-config -> js-yaml 3 -> argparse). Every package in that
 * chain is at its latest published version and the advisory lists no patched
 * release, so gating on it would mean a permanently red build.
 *
 * An exemption with no expiry is how a scoped gate becomes a permanent one, so
 * this script re-checks it weekly and reports when it is out of date:
 *
 *   - a dev-tree advisory outside EXEMPTIONS appears - the exemption is too narrow
 *   - an EXEMPTIONS advisory no longer appears in the tree - the exemption is dead
 *   - a WATCHED_FOR_RELEASE package publishes a version newer than the one
 *     recorded here - a fix may now exist, so re-evaluate and drop the exemption
 *   - an EXEMPTIONS id is missing from the build.yml comment - the gate and this
 *     script disagree about what is exempt
 *
 * Any of those exits 1, failing the scheduled run and making the workflow file an
 * issue. The known advisory on its own does NOT exit 1: it is expected, and a job
 * that is red every week trains people to ignore red.
 *
 * Run with `node scripts/audit-watch.mjs`.
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
const EXEMPTIONS = ['GHSA-hp3w-g68c-fv3c']

/**
 * Packages whose published version decides whether an exemption is still
 * justified. `newestKnown` is the newest release at the time the exemption was
 * written; a newer one on the registry means a fix may exist and the exemption
 * deserves a fresh look rather than another year of silence.
 */
const WATCHED_FOR_RELEASE = [{ name: 'sprintf-js', newestKnown: '1.1.3' }]

/**
 * `npm audit --json` exits 1 whenever it reports anything, so the exit code says
 * nothing about whether the command worked - parse the report instead.
 */
const runAudit = () => {
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
        packages: []
      }
      entry.packages.push(packageName)
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
    if (EXEMPTIONS.includes(id)) continue
    problems.push(
      `new dev-tree advisory ${id} (${advisory.severity}): ${advisory.title} - ` +
        `packages: ${[...new Set(advisory.packages)].sort().join(', ')}. ` +
        'Fix it, or add it to EXEMPTIONS and name it in the build.yml comment.'
    )
  }

  for (const id of EXEMPTIONS) {
    if (advisories.has(id)) continue
    problems.push(
      `exempted advisory ${id} no longer appears in the tree - the exemption is ` +
        'dead weight. Remove it from EXEMPTIONS and from the build.yml comment, ' +
        'and restore the full `npm audit` gate.'
    )
  }

  for (const { name, newestKnown } of WATCHED_FOR_RELEASE) {
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
  for (const id of EXEMPTIONS) {
    if (buildWorkflow.includes(id)) continue
    problems.push(
      `exemption ${id} is not named in ${BUILD_WORKFLOW} - the gate and this ` +
        'script disagree about what is exempt.'
    )
  }

  const { moderate = 0, high = 0, critical = 0, total = 0 } =
    report?.metadata?.vulnerabilities ?? {}

  const summary = [
    '## Dev-tree audit watch',
    '',
    `Full audit: ${total} advisories (${critical} critical, ${high} high, ${moderate} moderate).`,
    '',
    '| advisory | severity | packages | exempt |',
    '| --- | --- | --- | --- |',
    ...[...advisories].map(
      ([id, advisory]) =>
        `| ${id} | ${advisory.severity} | ${[...new Set(advisory.packages)].sort().join(', ')} | ` +
        `${EXEMPTIONS.includes(id) ? 'yes' : '**no**'} |`
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
