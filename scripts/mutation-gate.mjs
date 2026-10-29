// Runs mutation testing over the files a branch changed, and fails when a file
// carries more surviving mutants than the recorded baseline.
//
//   node scripts/mutation-gate.mjs pr        # changed files, compare to baseline
//   node scripts/mutation-gate.mjs weekly    # whole src, print the new baseline
//
// Set MUTATION_FILES to run the gate on named files instead of the diff - the
// way to check a file you are working on before committing it:
//
//   MUTATION_FILES=src/utils/parseMacroCalls.ts node scripts/mutation-gate.mjs pr
//
// A surviving mutant is a change to the code that no test noticed. The baseline
// records how many each file already carries, so the gate asks "did this branch
// add an untested behaviour?", not "is the repo perfect yet" - a threshold on
// the absolute score would fail every PR until the backlog is cleared.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BASELINE_FILE = 'mutation-baseline.json'
const REPORT_FILE = 'reports/mutation/mutation.json'
const NEW_FILE_FLOOR = 80
const BASELINE_COMMENT =
  'Surviving-mutant counts per file, used by scripts/mutation-gate.mjs. Refresh from the output of npm run mutation:watch; raise a count only with a reason in the PR that raises it.'

const mode = process.argv[2] || 'pr'

/**
 * The baseline to police a branch against.
 *
 * With a ref, this is the copy on the BASE branch, read out of git rather than
 * taken from the working tree: the file travels inside the PR, so a branch that
 * raises the number it is measured against would otherwise pass, and the weekly
 * watch - which compares against the merged value - would never fire either.
 */
const readBaseline = (ref) => {
  if (ref) {
    // A ref that cannot be resolved (a shallow clone, a typo) must fail loudly:
    // swallowing it drops the run to the new-file floor and reports green, which
    // is the same fail-open the changedFiles() handler refuses.
    try {
      execFileSync(
        'git',
        ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
        {
          stdio: ['ignore', 'ignore', 'ignore']
        }
      )
    } catch (e) {
      throw new Error(
        `cannot resolve the base ref '${ref}' - fetch it (fetch-depth: 0 in CI) or set MUTATION_FILES`
      )
    }

    // Does the ref carry a baseline at all? Ask git rather than reading the
    // error text of a failed `git show`, whose wording differs by version and is
    // empty when stderr is swallowed.
    try {
      execFileSync('git', ['cat-file', '-e', `${ref}:${BASELINE_FILE}`], {
        stdio: ['ignore', 'ignore', 'ignore']
      })
    } catch (e) {
      // the ref resolves but carried no baseline: the PR that adds the file
      return null
    }

    try {
      const raw = execFileSync('git', ['show', `${ref}:${BASELINE_FILE}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      })
      return JSON.parse(raw)
    } catch (e) {
      const detail = (e.stderr && e.stderr.toString().trim()) || e.message
      throw new Error(`cannot read ${BASELINE_FILE} at '${ref}': ${detail}`)
    }
  }

  if (!fs.existsSync(BASELINE_FILE)) return { files: {} }
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
}

/**
 * The ref a branch is policed against: MUTATION_BASE when set, otherwise the
 * merge base with origin/main, so the raise-check also fires for the documented
 * local run (`npm run mutation:changed` with no MUTATION_BASE) instead of
 * comparing the working copy against itself.
 */
const resolveBaseRef = () => {
  if (process.env.MUTATION_BASE) return process.env.MUTATION_BASE
  try {
    return execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch (e) {
    return null
  }
}

/** The source files this branch changed, relative to the base branch. */
const changedFiles = () => {
  const base = resolveBaseRef()
  if (!base) {
    console.error(
      'Could not resolve a base ref (no MUTATION_BASE, no origin/main to merge-base against).'
    )
    process.exit(1)
  }
  let diff = ''
  try {
    diff = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      encoding: 'utf8'
    })
  } catch (e) {
    // A broken clone or a missing base sha would otherwise look like "no files
    // changed" and turn the gate into a green no-op.
    console.error(`Could not diff against ${base}: ${e.message}`)
    console.error(
      'Fetch the base branch (fetch-depth: 0 in CI) or set MUTATION_FILES.'
    )
    process.exit(1)
  }

  const changed = diff
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const mutable = changed
    .filter((line) => line.startsWith('src/'))
    .filter((line) => line.endsWith('.ts'))
    .filter((line) => !line.endsWith('.spec.ts'))
    .filter((line) => fs.existsSync(line))

  return { changed, mutable }
}

const runStryker = (mutate) => {
  fs.rmSync('reports/mutation', { recursive: true, force: true })
  execFileSync(
    'npx',
    ['stryker', 'run', '--mutate', mutate.join(','), '--reporters', 'json'],
    { stdio: 'inherit' }
  )
  return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'))
}

/** Per-file totals from a Stryker JSON report. */
const summarise = (report) => {
  const files = {}
  for (const [name, file] of Object.entries(report.files)) {
    const mutants = file.mutants || []
    const survived = mutants.filter(
      (m) => m.status === 'Survived' || m.status === 'NoCoverage'
    )
    const killed = mutants.filter((m) => m.status === 'Killed').length
    const timeout = mutants.filter((m) => m.status === 'Timeout').length
    // Ignored (a `// Stryker disable` comment) and CompileError mutants cannot be
    // killed by any test, so counting them in the denominator reports a score
    // below Stryker's own and can fail a file with no real survivor. NoCoverage is
    // NOT one of them: a mutant no test executes is the untested behaviour this
    // gate exists to catch, so it counts against the score and as a survivor.
    const unkillable = mutants.filter(
      (m) => m.status === 'CompileError' || m.status === 'Ignored'
    ).length
    const covered = mutants.length - unkillable
    files[name] = {
      // no covered mutants means no test even ran against this file: scoring that
      // 100 would let a brand-new untested file pass the new-file floor
      score:
        covered === 0
          ? 0
          : Math.round(((killed + timeout) / covered) * 10000) / 100,
      survived: survived.length,
      killed,
      timeout,
      survivors: survived.map((m) => ({
        line: m.location.start.line,
        column: m.location.start.column,
        mutator: m.mutatorName,
        replacement: m.replacement,
        status: m.status
      }))
    }
  }
  return files
}

const describeSurvivor = (file, m) =>
  `  ${file}:${m.line}:${m.column} ${m.mutator} -> ${m.replacement}${
    m.status === 'NoCoverage' ? '  (no test executes this line)' : ''
  }`

if (mode === 'weekly') {
  const files = summarise(runStryker(['src/**/*.ts', '!src/**/*.spec.ts']))

  const baseline = readBaseline().files || {}

  // A file that reached main with no baseline entry - a push that bypassed the PR
  // gate, or a file added before this gate existed - is not reported by a
  // survivors-only comparison. It counts as a regression while it is below the
  // new-file floor.
  const regressions = Object.entries(files).filter(([name, stats]) => {
    const known = baseline[name]
    if (known === undefined) return stats.score < NEW_FILE_FLOOR
    return stats.survived > known.survived
  })

  console.log('\nPer-file mutation score:')
  for (const [name, stats] of Object.entries(files)) {
    console.log(
      `  ${name}: ${stats.score}% (${stats.killed} killed, ${stats.timeout} timeout, ${stats.survived} survived)`
    )
  }

  // Printed without the per-mutant detail, so a refresh is a diff of counts
  // rather than of every survivor's line and column. The timestamp stays: it is
  // the field a reader uses to judge how stale the counts are.
  const nextBaseline = {
    _comment: BASELINE_COMMENT,
    generatedAt: new Date().toISOString(),
    files: Object.fromEntries(
      Object.entries(files)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([name, stats]) => [
          name,
          {
            score: stats.score,
            survived: stats.survived,
            killed: stats.killed,
            timeout: stats.timeout
          }
        ])
    )
  }
  const printed = JSON.stringify(nextBaseline, null, 2)
  console.log('\nUpdated baseline (commit this as mutation-baseline.json):')
  console.log(printed)

  // the weekly workflow keeps the refreshed baseline as a job artifact, so the
  // new counts survive the log
  if (process.env.MUTATION_WATCH_REPORT)
    fs.writeFileSync(process.env.MUTATION_WATCH_REPORT, `${printed}\n`)

  if (regressions.length) {
    console.error('\nSurviving mutants grew since the baseline:')
    for (const [name, stats] of regressions) {
      const known = baseline[name]
      console.error(
        known === undefined
          ? `  ${name}: no baseline entry, scores ${stats.score}% (floor ${NEW_FILE_FLOOR}%)`
          : `  ${name}: ${known.survived} -> ${stats.survived}`
      )
      stats.survivors.forEach((m) => console.error(describeSurvivor(name, m)))
    }
    process.exit(1)
  }

  console.log('\nNo file carries more surviving mutants than the baseline.')
  process.exit(0)
}

// A PR that changes the gate's own configuration must still exercise it, or a
// broken config ships green: no source file changed, so the changed-file run has
// nothing to mutate. The probe is a small file with a baseline entry.
const PROBE_FILES = ['src/utils/getIndicesOf.ts']

const WATCHED_CONFIG = [
  'jest.config.js',
  'jest.stryker.config.js',
  'stryker.conf.json',
  'mutation-baseline.json',
  'scripts/mutation-gate.mjs',
  'package.json',
  'package-lock.json'
]

// The `list` mode prints the files a matrix job should mutate, as a JSON array,
// and stops. It exists so the workflow can put one file per job: the gate mutated
// the changed files SEQUENTIALLY, and a PR touching nineteen of them ran past the
// job's timeout and reported no verdict at all (sasjs/lint#272).
if (mode === 'list') {
  const { changed, mutable } = changedFiles()
  const onlyConfigChanged =
    !mutable.length && changed.some((f) => WATCHED_CONFIG.includes(f))
  const files = onlyConfigChanged ? PROBE_FILES : mutable
  if (onlyConfigChanged)
    console.error('Only the gate configuration changed; listing the probe file.')
  console.log(JSON.stringify(files))
  process.exit(0)
}

let mutate = []
let configOnly = false

if (process.env.MUTATION_FILES) {
  mutate = process.env.MUTATION_FILES.split(',')
    .map((f) => f.trim())
    .filter(Boolean)
} else {
  const { changed, mutable } = changedFiles()
  mutate = mutable
  configOnly =
    !mutable.length && changed.some((f) => WATCHED_CONFIG.includes(f))
  if (configOnly) {
    console.log(
      'Only the gate configuration changed; running it against the probe file.'
    )
    mutate = PROBE_FILES
  }
}

if (!mutate.length) {
  console.log('No changed source files to mutate.')
  process.exit(0)
}

console.log(`Mutating the files this branch changed:\n  ${mutate.join('\n  ')}`)

const files = summarise(runStryker(mutate))
const baseRef = resolveBaseRef()
let baseBaseline = null
if (!baseRef) {
  console.error(
    'Could not resolve a base ref (no MUTATION_BASE, no origin/main to merge-base against).'
  )
  process.exit(1)
}
try {
  baseBaseline = readBaseline(baseRef)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
console.log(`Base ref: ${baseRef}`)
const headBaseline = readBaseline().files || {}
const baseline = baseBaseline ? baseBaseline.files || {} : {}
const failures = []

// The baseline travels inside the PR, so a branch can otherwise raise the number
// it is measured against - and the weekly watch compares against the merged
// value, so it would stay quiet too.
if (baseBaseline) {
  Object.entries(headBaseline).forEach(([name, entry]) => {
    const known = baseline[name]
    if (!known) {
      if (!configOnly) console.log(`${name}: added to the baseline in this PR`)
      return
    }
    if (entry.survived > known.survived)
      failures.push(
        `${name}: the baseline was raised in this PR, ${known.survived} -> ${entry.survived} surviving mutants`
      )
  })
  Object.keys(baseline).forEach((name) => {
    if (headBaseline[name]) return
    // A source file deleted or renamed in this PR takes its entry with it; the
    // entry only has to go when the file is still there to be mutated.
    if (!fs.existsSync(name)) {
      console.log(`${name}: deleted, its baseline entry goes with it`)
      return
    }
    failures.push(`${name}: removed from the baseline in this PR`)
  })
}

for (const [name, stats] of Object.entries(files)) {
  const known = baseline[name]

  if (!known) {
    if (stats.score < NEW_FILE_FLOOR) {
      failures.push(
        `${name} scores ${stats.score}% and has no baseline: a new file must reach ${NEW_FILE_FLOOR}%`
      )
      stats.survivors.forEach((m) => failures.push(describeSurvivor(name, m)))
    } else {
      console.log(`${name}: ${stats.score}% (new file, above the floor)`)
    }
    continue
  }

  if (stats.survived > known.survived) {
    failures.push(
      `${name}: ${known.survived} -> ${stats.survived} surviving mutants`
    )
    stats.survivors.forEach((m) => failures.push(describeSurvivor(name, m)))
  } else {
    console.log(
      `${name}: ${stats.score}% (${stats.survived} survived, baseline ${known.survived})`
    )
  }
}

if (failures.length) {
  console.error('\nMutation gate failed:\n' + failures.join('\n'))
  console.error(
    '\nA surviving mutant is a change no test noticed. Add a spec that fails on it,\n' +
      'then run `npm run mutation:changed` again. If a mutant is genuinely\n' +
      'equivalent (the change cannot alter behaviour), say so in the PR body.'
  )
  process.exit(1)
}

console.log('\nMutation gate passed.')
