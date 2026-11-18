/**
 * Full-tree npm audit, including dev dependencies, with a written allowlist.
 *
 * Both the build and the scheduled watch fail on any advisory that is not on the
 * allowlist. An entry carries the advisory id, the severity it was waived at and
 * the reason it is still open, so a waiver is a reviewed line in the repository
 * rather than a shrugged shoulder at the failure.
 *
 * Matching is by advisory, not by package: npm reports one advisory once for
 * every package in the tree it reaches, so `GHSA-fc5q-39xc-vjpf` arrives under
 * the whole jest chain as well as under picomatch itself - an allowlist keyed by
 * package would carry thirty-six copies of one reason.
 *
 * An entry marked `devOnly` claims the package cannot reach what ships, and that
 * claim is measured rather than trusted: when such an advisory is present, the
 * production set is audited too, and the gate fails if the id appears there. An
 * advisory re-rated above the severity it was waived at fails as well - the
 * reason did not anticipate that. An entry that no longer matches anything is
 * reported as stale, not as a failure, because a list that fails when a fix
 * lands gets deleted rather than kept current.
 *
 * --gate is accepted as a legacy no-op: both invocations run the same audit.
 * --audit-json=<path> supplies a fixture for tests, never an environment variable.
 * --production-json=<path> does the same for the production set; without it, and
 * with a dev-only waiver present in the report, npm is asked for that set.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

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

const argument = (name) => {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : undefined
}

const runAudit = (fixture, omitDev) => {
  if (fixture) {
    return {
      report: JSON.parse(readFileSync(fixture, 'utf8')),
      status: 0
    }
  }

  const args = ['audit', '--json', '--audit-level=info']
  if (omitDev) args.push('--omit=dev')
  else
    args.push(
      '--include=prod',
      '--include=dev',
      '--include=optional',
      '--include=peer'
    )

  let stdout
  let status = 0
  try {
    stdout = execFileSync('npm', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024
    })
  } catch (error) {
    stdout = error.stdout
    status = error.status
    if (status !== 1) throw new Error('npm audit failed to run')
  }
  if (!stdout || !stdout.trim()) throw new Error('npm audit produced no JSON')
  return { report: JSON.parse(stdout), status }
}

/** A report that cannot be judged is not a clean report. */
const checkReport = (report, status) => {
  const vulnerabilities = report?.vulnerabilities
  const counts = report?.metadata?.vulnerabilities
  if (
    report?.auditReportVersion !== 2 ||
    !vulnerabilities ||
    typeof vulnerabilities !== 'object' ||
    Array.isArray(vulnerabilities) ||
    !counts ||
    typeof counts !== 'object' ||
    !Number.isSafeInteger(counts.total) ||
    counts.total < 0 ||
    counts.total !== Object.keys(vulnerabilities).length ||
    (status !== 0 && counts.total === 0)
  ) {
    throw new Error('npm audit returned an invalid or unsuccessful report')
  }

  return report
}

/**
 * One entry per advisory, not per affected package.
 *
 * A package whose `via` holds only names is one an advisory reaches through
 * another package; its own entry is the one that names the advisory, so the
 * adopted one is what this list judges. A package with no advisory object at all
 * is kept under a key no allowlist entry can match, which is how it still fails.
 */
const advisoriesIn = (report) => {
  const seen = new Map()
  const packages = report.vulnerabilities || {}

  for (const [name, info] of Object.entries(packages)) {
    const via = Array.isArray(info?.via) ? info.via : []
    const named = via.filter((one) => typeof one === 'object' && one !== null)
    const through = via.filter((one) => typeof one === 'string')

    if (!named.length) {
      // A package whose only `via` entries are names is one an advisory reaches
      // through another package; it is the same advisory, so it is judged by the
      // package that carries it. A package naming nothing in the tree, or naming
      // a package that is not waived, is one nothing accounts for.
      if (!through.length)
        seen.set(`package:${name}`, {
          source: '',
          package: name,
          severity: info?.severity ?? 'unknown',
          title: ''
        })
      else
        seen.set(`through:${name}`, {
          source: '',
          package: name,
          severity: info?.severity ?? 'unknown',
          title: '',
          through
        })
      continue
    }

    for (const one of named)
      seen.set(String(one.source ?? one.url ?? one.title), {
        source: String(one.source ?? one.url ?? one.title ?? ''),
        package: name,
        severity: one.severity ?? info?.severity ?? 'unknown',
        title: one.title ?? ''
      })
  }

  return [...seen.values()]
}

const main = () => {
  const { report, status } = runAudit(argument('audit-json'), false)
  checkReport(report, status)

  const allowlist = JSON.parse(
    readFileSync(
      argument('allowlist') ?? join(here, 'audit-allowlist.json'),
      'utf8'
    )
  )
  const advisories = advisoriesIn(report)
  const allowed = new Map(
    allowlist.map((entry) => [String(entry.source), entry])
  )

  // The severity is part of the match: an advisory waived as a high that is
  // re-rated as critical is news, not something the old reason still covers.
  const carried = (one) => {
    if (one.through) return false
    const entry = allowed.get(one.source)
    return Boolean(entry) && entry.severity === one.severity
  }
  const waived = advisories.filter(carried)
  const waivedIds = new Set(waived.map((one) => one.source))

  /**
   * A package that names the packages an advisory reaches it through is that
   * advisory, so it is carried exactly when everything it names is. The set is
   * closed over the tree, because npm reports the chain rather than the leaf:
   * `@jest/console` names `jest-util`, which names `picomatch`, and only the
   * last of the three carries an id of its own. A package naming something the
   * report does not carry - an advisory with no id at all - is refused.
   */
  const carriedPackages = new Set(waived.map((one) => one.package))
  const throughOf = new Map()
  for (const [name, info] of Object.entries(report.vulnerabilities || {})) {
    const named = (Array.isArray(info?.via) ? info.via : []).filter(
      (one) => typeof one === 'object' && one !== null
    )
    const through = (Array.isArray(info?.via) ? info.via : []).filter(
      (one) => typeof one === 'string'
    )
    if (!named.length && through.length) throughOf.set(name, through)
  }
  for (let changed = true; changed;) {
    changed = false
    for (const [name, through] of throughOf)
      if (
        !carriedPackages.has(name) &&
        through.every((one) => carriedPackages.has(one))
      ) {
        carriedPackages.add(name)
        changed = true
      }
  }

  const refused = advisories.filter((one) =>
    one.through ? !carriedPackages.has(one.package) : !carried(one)
  )
  const carriedAll = advisories.filter((one) => !refused.includes(one))
  const stale = allowlist.filter(
    (entry) => !advisories.some((one) => one.source === String(entry.source))
  )

  /**
   * The dev-only claim, measured.
   *
   * A `devOnly` waiver says the package reaches nothing that ships. Matching is
   * by advisory id over the whole tree, so that sentence would go on waiving it
   * after a production dependency pulled the same package in; the production set
   * is therefore audited whenever such an entry is in play, and an id that
   * appears there fails the gate.
   */
  const devOnlyWaivers = waived.filter(
    (one) => allowed.get(one.source)?.devOnly
  )
  let shipped = []
  if (devOnlyWaivers.length) {
    const production = runAudit(argument('production-json'), true)
    checkReport(production.report, production.status)
    shipped = advisoriesIn(production.report)
  }

  const reachedProduction = devOnlyWaivers.filter((one) =>
    shipped.some((other) => other.source === one.source)
  )
  const refusedProduction = refused.length || reachedProduction.length

  const summary = [
    '## Full dependency audit',
    '',
    `Full audit: ${advisories.filter((one) => !one.through).length} distinct advisory/advisories, ${allowlist.length} allowlisted.`,
    '',
    ...refused.map(
      (one) =>
        `- REFUSED ${one.severity}: ${one.package} ${one.source || '(no advisory id)'} ${one.title}`
    ),
    ...waived.map((one) => {
      const entry = allowed.get(one.source)
      return `- waived ${one.severity}${entry?.devOnly ? ' (dev-only)' : ''}: ${one.package} ${one.source} - ${entry?.reason ?? ''}`
    }),
    ...reachedProduction.map(
      (one) =>
        `- REFUSED ${one.severity}: ${one.package} ${one.source} was waived as dev-only, but it reaches the production set`
    ),
    ...carriedAll
      .filter((one) => one.through)
      .map((one) => `- carried through a waived advisory: ${one.package}`),
    ...stale.map(
      (entry) =>
        `- stale: ${entry.package} ${entry.source} no longer matches an advisory - ${entry.reason}`
    ),
    '',
    refusedProduction
      ? 'Fix the refused advisories, or give each a reason that accounts for the exposure.'
      : advisories.length
        ? 'No unwaived advisories.'
        : 'No vulnerabilities found.',
    ''
  ].join('\n')

  console.log(summary)
  writeReport(summary)
  process.exitCode = refusedProduction ? 1 : 0
}

try {
  main()
} catch (error) {
  const summary = [
    '## Full dependency audit',
    '',
    'The audit did not complete; the dependency tree is **not** verified.',
    '',
    '```',
    error.message,
    '```',
    ''
  ].join('\n')
  console.error(`audit watch failed: ${error.message}`)
  writeReport(summary)
  process.exit(1)
}
