const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const yaml = require('js-yaml')
const { once } = require('node:events')

const workflow = yaml.load(fs.readFileSync('.github/workflows/publish.yml', 'utf8'))
const steps = workflow.jobs.build.steps
const prepare = steps.find((step) => step.id === 'prepare')
test('publish workflow uses the released preparation tool and fails closed', () => {
  assert.ok(prepare, 'prepare step must exist')
  assert.match(prepare.run, /--prepare-publish/)
  const publish = steps.find((step) => step.name === 'Publish to npm with trusted publisher')
  assert.match(publish.if, /steps\.prepare\.outputs\.publish == 'true'/)
  assert.match(publish.if, /steps\.prepare\.outputs\.skip == 'false'/)
})

test('preserves trigger, identity and package guards', () => {
  assert.deepEqual(workflow.on.workflow_run, { workflows: ['Release'], types: ['completed'], branches: ['main'] })
  assert.ok(workflow.on.workflow_dispatch)
  assert.equal(workflow.permissions.contents, 'read')
  assert.equal(workflow.permissions['id-token'], 'write')
  assert.match(workflow.jobs.build.if, /github\.repository == 'sasjs\/lint'/)
  assert.match(workflow.jobs.build.if, /workflow_run\.conclusion == 'success'/)
  assert.equal(steps.find((step) => step.uses?.startsWith('actions/checkout')).with.ref, 'main')
  assert.equal(steps.find((step) => step.uses?.startsWith('actions/checkout')).with['fetch-depth'], 0)
  const installToolIndex = steps.findIndex(s => s.name === 'Install the release tool')
  const tagCheckoutIndex = steps.findIndex(s => s.name === 'Check out the tag')
  const prepareIndex = steps.findIndex(s => s.id === 'prepare')
  assert.ok(installToolIndex >= 0 && installToolIndex < tagCheckoutIndex && tagCheckoutIndex < prepareIndex)
  assert.match(steps[installToolIndex].run, /cp node_modules\/@sasjs\/release\/release\.mjs/)
  assert.match(steps[tagCheckoutIndex].run, /git checkout -q "refs\/tags\/\$TAG"/)
  assert.ok(steps.findIndex(s => s.name === 'Validate and synchronize the stamped version') > prepareIndex)
  for (const name of ['Check Code Style', 'Run Unit Tests', 'Build Project', 'Clean up ready for publishing', 'Check the tarball carries the public API', "The version is the tag's"]) assert.ok(steps.some((step) => step.name === name), name)
})



test('real released tool and workflow shell gate events, tags, branches and registry failures', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-publish-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const repo = path.join(root, 'repo')
  const runner = path.join(root, 'runner')
  const bin = path.join(root, 'bin')
  fs.mkdirSync(repo); fs.mkdirSync(runner); fs.mkdirSync(bin)
  fs.copyFileSync(require.resolve('@sasjs/release/release.mjs'), path.join(runner, 'sasjs-release.mjs'))
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'test@example.invalid')
  git('config', 'user.name', 'Test')
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: '@sasjs/lint', version: '0.0.0' }))
  git('add', 'package.json'); git('commit', '-qm', 'main')
  const sha = git('rev-parse', 'HEAD')
  git('tag', 'v1.2.3'); git('tag', 'v1.2.4'); git('tag', 'x1.2.3')
  git('checkout', '-qb', 'other')
  fs.writeFileSync(path.join(repo, 'other'), 'x')
  git('add', 'other'); git('commit', '-qm', 'other'); git('tag', 'v2.0.0')
  git('checkout', '-q', 'main')
  fs.writeFileSync(path.join(repo, 'main-only'), 'newer')
  git('add', 'main-only'); git('commit', '-qm', 'newer main')
  const mainHead = git('rev-parse', 'HEAD')
  const other = git('rev-parse', 'other')
  const statusFile = path.join(root, 'status')
  fs.writeFileSync(statusFile, '404')
  const server = spawn(process.execPath, ['-e', `const http=require('http'),fs=require('fs'); http.createServer((req,res)=>{res.writeHead(+fs.readFileSync(process.argv[1]));res.end('{}')}).listen(0,'127.0.0.1',function(){console.log(this.address().port)})`, statusFile], { stdio: ['ignore', 'pipe', 'inherit'] })
  t.after(() => server.kill())
  const [chunk] = await once(server.stdout, 'data')
  const registry = `http://127.0.0.1:${String(chunk).trim()}`
  fs.writeFileSync(path.join(bin, 'node'), `#!/bin/bash\nexec "${process.execPath}" "$@" --registry "$TEST_REGISTRY"\n`, { mode: 0o755 })
  const run = (step, env = {}) => {
    const output = path.join(root, 'output')
    fs.writeFileSync(output, '')
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', step.run], {
      cwd: repo, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: runner, TEST_REGISTRY: registry, GITHUB_OUTPUT: output, EVENT: 'workflow_run', SHA: sha, REQUESTED: '', REPUBLISH: '', ...env }
    })
    const values = Object.fromEntries(fs.readFileSync(output, 'utf8').trim().split('\n').filter(Boolean).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)] }))
    return { ...result, values }
  }
  const resolve = steps.find(s => s.id === 'resolve')
  const verify = steps.find(s => s.name === 'Verify the resolved tag is on the checked-out main')
  const attempt = (env) => run(resolve, env)
  let r = attempt()
  assert.equal(r.status, 0, r.stderr); assert.equal(r.values.tag, 'v1.2.4'); assert.equal(r.values.publish, 'true')
  assert.equal(JSON.parse(fs.readFileSync(path.join(repo, 'package.json'))).version, '0.0.0')
  assert.equal(run(verify, { TAG: r.values.tag }).status, 0)
  const checkout = steps.find(s => s.name === 'Check out the tag')
  const selectedTag = r.values.tag
  assert.equal(run(checkout, { TAG: selectedTag }).status, 0)
  assert.equal(git('rev-parse', 'HEAD'), sha)
  assert.notEqual(git('rev-parse', 'HEAD'), mainHead)
  r = run(prepare, { TAG: selectedTag }); assert.equal(r.status, 0, r.stderr)
  assert.equal(r.values.publish, 'true'); assert.equal(JSON.parse(fs.readFileSync(path.join(repo, 'package.json'))).version, '1.2.4')
  assert.notEqual(run(prepare, { TAG: '' }).status, 0)
  fs.writeFileSync(statusFile, '500')
  assert.notEqual(run(prepare, { TAG: selectedTag }).status, 0)
  const npm = spawnSync('npm', ['version', '1.2.4', '--no-git-tag-version', '--allow-same-version'], { cwd: repo, encoding: 'utf8' })
  assert.equal(npm.status, 0, npm.stderr)
  git('checkout', '-q', 'main')
  fs.writeFileSync(statusFile, '200')
  r = attempt(); assert.equal(r.status, 0); assert.equal(r.values.publish, 'false')
  r = attempt({ EVENT: 'workflow_dispatch', REQUESTED: 'v1.2.3', REPUBLISH: 'true' }); assert.equal(r.status, 0); assert.equal(r.values.publish, 'true'); assert.equal(r.values.tag, 'v1.2.3')
  for (const status of ['401', '403', '500']) { fs.writeFileSync(statusFile, status); r = attempt(); assert.notEqual(r.status, 0, status); assert.notEqual(r.values.publish, 'true') }
  server.kill(); await once(server, 'exit')
  r = attempt(); assert.notEqual(r.status, 0); assert.notEqual(r.values.publish, 'true')
  for (const env of [
    { EVENT: 'workflow_dispatch', REQUESTED: '' },
    { EVENT: 'workflow_dispatch', REQUESTED: 'main' },
    { EVENT: 'workflow_dispatch', REQUESTED: 'x1.2.3' },
    { EVENT: 'workflow_dispatch', REQUESTED: 'v2.0.0' },
    { EVENT: 'workflow_run', SHA: '' },
    { EVENT: 'workflow_run', SHA: 'deadbeef' },
    { EVENT: 'push' }
  ]) assert.notEqual(attempt(env).status, 0, JSON.stringify(env))
  assert.notEqual(run(verify, { TAG: 'v2.0.0' }).status, 0)
  // A release without a tag is a clean skip, but a shallow checkout cannot prove it.
  r = attempt({ SHA: other }); assert.notEqual(r.status, 0) // tag exists, but is off main
  git('tag', '-d', 'v2.0.0')
  r = attempt({ SHA: other }); assert.equal(r.status, 0); assert.equal(r.values.skip, 'true'); assert.equal(r.values.publish, 'false')
  git('tag', '-d', 'v1.2.3', 'v1.2.4')
  const shallow = path.join(root, 'shallow')
  const clone = spawnSync('git', ['clone', '-q', '--depth=1', `file://${repo}`, shallow], { encoding: 'utf8' }); assert.equal(clone.status, 0, clone.stderr)
  const output = path.join(root, 'shallow-output')
  const shallowResult = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', resolve.run], { cwd: shallow, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: runner, TEST_REGISTRY: registry, GITHUB_OUTPUT: output, EVENT: 'workflow_run', SHA: git('rev-parse', 'HEAD'), REQUESTED: '', REPUBLISH: '' } })
  assert.notEqual(shallowResult.status, 0); assert.match(shallowResult.stderr, /shallow/)
})
