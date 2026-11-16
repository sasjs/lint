import { execFileSync } from 'child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const script = path.resolve(__dirname, 'audit-watch.mjs')

const report = (vulnerabilities: Record<string, unknown>, total: number) => ({
  auditReportVersion: 2,
  vulnerabilities,
  metadata: {
    vulnerabilities: {
      info: 0,
      low: total,
      moderate: 0,
      high: 0,
      critical: 0,
      total
    }
  }
})

const advisory = (id: string, name: string, node: string) =>
  report(
    {
      [name]: {
        severity: 'low',
        nodes: [node],
        via: [
          {
            url: `https://github.com/advisories/${id}`,
            severity: 'low',
            title: 'fixture'
          }
        ]
      }
    },
    1
  )

const run = (args: string[], env = process.env) => {
  try {
    return {
      code: 0,
      output: execFileSync('node', [script, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env
      })
    }
  } catch (error: any) {
    return {
      code: error.status ?? 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`
    }
  }
}

const runFixture = (value: unknown, gate = false) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-watch-'))
  const fixture = path.join(dir, 'audit.json')
  writeFileSync(fixture, JSON.stringify(value))
  return run([...(gate ? ['--gate'] : []), `--audit-json=${fixture}`])
}

describe('full audit', () => {
  it('passes a clean report', () => {
    expect(runFixture(report({}, 0)).code).toBe(0)
  })

  it.each([
    [
      'new advisory',
      'GHSA-aaaa-bbbb-cccc',
      'left-pad',
      'node_modules/left-pad'
    ],
    [
      'formerly exempt advisory',
      'GHSA-gcqx-w48m-w2h4',
      'deepmerge',
      'node_modules/deepmerge'
    ],
    [
      'nested formerly exempt advisory',
      'GHSA-gcqx-w48m-w2h4',
      'deepmerge',
      'node_modules/jest-config/node_modules/deepmerge'
    ]
  ])('fails on %s', (_label, id, name, node) => {
    const result = runFixture(advisory(id, name, node))
    expect(result.code).toBe(1)
    expect(result.output).toContain(id)
  })

  it('fails on vulnerabilities without a GHSA URL', () => {
    const result = runFixture(
      report(
        {
          indirect: {
            severity: 'low',
            nodes: ['node_modules/indirect'],
            via: ['other']
          }
        },
        1
      )
    )
    expect(result.code).toBe(1)
  })

  it.each([
    {},
    { error: { code: 'EAUDIT', summary: 'audit failed' } },
    report({}, 1)
  ])('fails closed on an invalid report', (value) => {
    expect(runFixture(value).code).toBe(1)
  })

  it.each([
    ['clean', report({}, 0)],
    [
      'vulnerable',
      advisory('GHSA-gcqx-w48m-w2h4', 'deepmerge', 'node_modules/deepmerge')
    ]
  ])(
    'accepts the legacy --gate flag without changing a %s audit',
    (_label, value) => {
      expect(runFixture(value, true)).toEqual(runFixture(value))
    }
  )
})

describe('npm audit execution', () => {
  it('explicitly includes dev dependencies and all severities despite npm configuration', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'audit-npm-'))
    const npm = path.join(dir, 'npm')
    const argsFile = path.join(dir, 'args')
    writeFileSync(
      npm,
      `#!/bin/sh\nprintf '%s\\n' "$@" > "$AUDIT_ARGS"\nprintf '%s\\n' '${JSON.stringify(report({}, 0))}'\n`
    )
    chmodSync(npm, 0o755)
    const result = run(['--gate'], {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      AUDIT_ARGS: argsFile
    })
    expect(result.code).toBe(0)
    const args = readFileSync(argsFile, 'utf8')
    expect(args).toContain('--include=prod')
    expect(args).toContain('--include=dev')
    expect(args).toContain('--include=optional')
    expect(args).toContain('--include=peer')
    expect(args).toContain('--audit-level=info')
  })

  it('fails closed when npm exits unsuccessfully despite a clean-looking JSON report', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'audit-npm-'))
    const npm = path.join(dir, 'npm')
    writeFileSync(
      npm,
      `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(report({}, 0))}'\nexit 1\n`
    )
    chmodSync(npm, 0o755)
    const result = run(['--gate'], {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`
    })
    expect(result.code).toBe(1)
  })
})
