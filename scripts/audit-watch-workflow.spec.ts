import { execFileSync } from 'child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const workflow = readFileSync(
  path.resolve(__dirname, '../.github/workflows/audit-watch.yml'),
  'utf8'
)
const script = workflow.split('        run: |\n')[1]
  .split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line)
  .join('\n')

const runIssueStep = (existing: string, hasReport: boolean) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-workflow-'))
  const gh = path.join(dir, 'gh')
  const log = path.join(dir, 'calls')
  const report = path.join(dir, 'report.md')
  if (hasReport) writeFileSync(report, 'new advisory details\n')
  writeFileSync(gh, `#!/bin/sh\nprintf '%s\\n' "$*" >> "$CALLS"\nif [ "$1 $2" = 'issue list' ]; then printf '%s' "$EXISTING"; fi\nif [ "$1 $2" = 'issue comment' ] || [ "$1 $2" = 'issue create' ]; then\n  while [ "$#" -gt 0 ]; do\n    if [ "$1" = '--body-file' ]; then shift; /bin/cat "$1" >> "$CALLS"; fi\n    shift\n  done\nfi\n`)
  chmodSync(gh, 0o755)
  execFileSync('bash', ['-e', '-c', script], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, CALLS: log,
      REPORT: report, EXISTING: existing, GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'sasjs/lint', GITHUB_RUN_ID: '42' }
  })
  return readFileSync(log, 'utf8')
}

describe('weekly audit issue step', () => {
  it('adds a new report to an existing audit issue rather than silently suppressing it', () => {
    const calls = runIssueStep('123', true)
    expect(calls).toContain('issue comment 123 --body-file')
    expect(calls).toContain('new advisory details')
    expect(calls).not.toContain('issue create')
  })

  it('creates an issue with the report if no matching issue exists', () => {
    const calls = runIssueStep('', true)
    expect(calls).toContain('issue create --title Audit watch: dependency audit failed --body-file')
    expect(calls).toContain('new advisory details')
  })

  it('creates an issue with the run link if no report or matching issue exists', () => {
    const calls = runIssueStep('', false)
    expect(calls).toContain('issue create --title Audit watch: dependency audit failed --body')
    expect(calls).toContain('https://github.com/sasjs/lint/actions/runs/42')
  })

  it('reports a run link even when the audit produced no report', () => {
    const calls = runIssueStep('123', false)
    expect(calls).toContain('issue comment 123 --body')
    expect(calls).toContain('https://github.com/sasjs/lint/actions/runs/42')
  })
})
