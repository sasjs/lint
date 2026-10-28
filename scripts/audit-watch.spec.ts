import { execFileSync } from 'child_process'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

/**
 * Drives `scripts/audit-watch.mjs --gate` against fixture audit reports, so the
 * gate is proved on shapes the installed tree does not have: a copy of an
 * exempted package that npm resolves nested rather than hoisted, and an advisory
 * nobody has listed.
 *
 * The script takes the report from `--audit-json=<path>`, which is the seam that
 * lets a case describe a tree without installing one - an argument rather than
 * an environment variable, so the step that decides the build cannot have its
 * input replaced by a workflow `env:` entry.
 */
const script = path.resolve(__dirname, 'audit-watch.mjs')

const advisory = (id: string, packageName: string, nodes: string[]) => ({
  vulnerabilities: {
    [packageName]: {
      severity: 'low',
      nodes,
      via: [
        {
          source: 1,
          url: `https://github.com/advisories/${id}`,
          severity: 'low',
          title: 'fixture'
        }
      ]
    }
  },
  metadata: { vulnerabilities: { low: nodes.length, total: nodes.length } }
})

const run = (report: unknown) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-watch-'))
  const fixture = path.join(dir, 'audit.json')
  writeFileSync(fixture, JSON.stringify(report))

  try {
    const stdout = execFileSync(
      'node',
      [script, '--gate', `--audit-json=${fixture}`],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    return { code: 0, output: stdout }
  } catch (error: any) {
    return {
      code: error.status ?? 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`
    }
  }
}

describe('audit-watch gate', () => {
  it('should pass when the exempted package is hoisted', () => {
    const result = run(
      advisory('GHSA-gcqx-w48m-w2h4', 'deepmerge', ['node_modules/deepmerge'])
    )

    expect(result.code).toBe(0)
  })

  it('should pass when npm resolves the exempted package nested', () => {
    // npm reports where it resolved the copy, so an exact-path comparison would
    // fail the gate for a tree the entry was written to allow - the permanently
    // red gate the exemption exists to prevent.
    const result = run(
      advisory('GHSA-gcqx-w48m-w2h4', 'deepmerge', [
        'node_modules/jest-config/node_modules/deepmerge'
      ])
    )

    expect(result.code).toBe(0)
  })

  it('should fail on an advisory that is not exempt', () => {
    const result = run(
      advisory('GHSA-aaaa-bbbb-cccc', 'left-pad', ['node_modules/left-pad'])
    )

    expect(result.code).toBe(1)
    expect(result.output).toContain('new advisory GHSA-aaaa-bbbb-cccc')
    expect(result.output).toContain('at node_modules/left-pad')
  })

  it('should fail when the exemption no longer appears in the tree', () => {
    const result = run({
      vulnerabilities: {},
      metadata: { vulnerabilities: {} }
    })

    expect(result.code).toBe(1)
    expect(result.output).toContain('no longer appears in the tree')
  })

  it('should fail when the advisory sits at a path the entry does not cover', () => {
    // A copy that arrived through another dependency must not pass under the
    // argument written about the first one: `@scope/deepmerge` is not
    // `deepmerge`, and its path does not end with the covered one.
    const result = run(
      advisory('GHSA-gcqx-w48m-w2h4', 'deepmerge', [
        'node_modules/@scope/deepmerge'
      ])
    )

    expect(result.code).toBe(1)
    expect(result.output).toContain('does not cover')
  })
})
