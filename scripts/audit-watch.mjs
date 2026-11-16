/**
 * Full-tree npm audit, including dev dependencies, with no exemptions. Both the
 * build's --gate invocation and the scheduled watch fail on every vulnerability.
 * build.yml and audit-watch.yml still describe the retired deepmerge exemption;
 * those workflow comments need a follow-up by someone with workflow permission.
 *
 * --audit-json=<path> supplies a fixture for tests, never an environment variable.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

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

const runAudit = () => {
  const fixture = process.argv.find((arg) => arg.startsWith('--audit-json='))
  if (fixture) {
    return {
      report: JSON.parse(
        readFileSync(fixture.slice('--audit-json='.length), 'utf8')
      ),
      status: 0
    }
  }

  let stdout
  let status = 0
  try {
    stdout = execFileSync(
      'npm',
      [
        'audit',
        '--json',
        '--include=prod',
        '--include=dev',
        '--include=optional',
        '--include=peer',
        '--audit-level=info'
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }
    )
  } catch (error) {
    stdout = error.stdout
    status = error.status
    if (status !== 1) throw new Error('npm audit failed to run')
  }
  if (!stdout || !stdout.trim()) throw new Error('npm audit produced no JSON')
  return { report: JSON.parse(stdout), status }
}

const main = () => {
  const { report, status } = runAudit()
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

  const entries = Object.entries(vulnerabilities)
  const summary = [
    '## Full dependency audit',
    '',
    `Full audit: ${counts.total} vulnerable packages, including dev dependencies.`,
    '',
    ...entries.map(([name, info]) => {
      const ids = (Array.isArray(info?.via) ? info.via : [])
        .filter((via) => typeof via === 'object' && via !== null)
        .map((via) => via.url || via.title || 'unknown advisory')
      const nodes = Array.isArray(info?.nodes) ? info.nodes.join(', ') : ''
      return `- ${name} (${info?.severity ?? 'unknown severity'}): ${ids.join(', ') || 'transitive advisory'}${nodes ? ` at ${nodes}` : ''}`
    }),
    '',
    entries.length
      ? 'Fix all vulnerabilities; there are no exemptions.'
      : 'No vulnerabilities found.',
    ''
  ].join('\n')

  console.log(summary)
  writeReport(summary)
  process.exitCode = entries.length ? 1 : 0
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
