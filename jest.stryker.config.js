/**
 * Jest config for Stryker runs.
 *
 * The only difference from jest.config.js is that coverage is off: Stryker
 * instruments the code itself, and the coverage thresholds would fail a
 * single-mutant run. The suite itself runs in full, so the weekly baseline is
 * built on every test - a skipped spec here would record mutants it covers as
 * legitimate survivors and let them into the baseline permanently.
 */
const base = require('./jest.config.js')

module.exports = {
  ...base,
  collectCoverage: false,
  coverageThreshold: undefined,
  collectCoverageFrom: undefined
}
