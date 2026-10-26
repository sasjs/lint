module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // A Stryker run keeps a sandbox under .stryker-tmp with a copy of src/ in it.
  // Without this, any jest run that overlaps a mutation run collects every spec
  // twice (measured: 946 tests instead of 464) and reports failures from files
  // that are being mutated. Anchored to <rootDir> on purpose: inside the sandbox
  // the whole project IS under .stryker-tmp, and an unanchored pattern would make
  // Stryker's own dry run collect nothing ("No tests were executed").
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.stryker-tmp/',
    '<rootDir>/build/'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10
    },
    // Per-path floors, so a change that hollows out one area cannot hide behind
    // the aggregate. Every number is the coverage measured when this was written,
    // rounded down, so the block is a ratchet: raise one when the area improves,
    // never lower one to get a branch green. `statements` is a PERCENTAGE unless
    // it is negative, where `-N` reads as "at most N uncovered statements" - so a
    // plain `0` asserts nothing at all (0% coverage passes), which is why the two
    // fully-covered areas ask for 100 and the three with known gaps carry a budget
    // measured from the tree on the day this landed.
    './src/utils/': {
      branches: 95,
      functions: 100,
      lines: 99,
      statements: -4
    },
    './src/rules/': {
      branches: 95,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/lint/': {
      branches: 85,
      functions: 100,
      lines: 100,
      statements: -2
    },
    './src/format/': {
      branches: 90,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/types/': {
      branches: 95,
      functions: 100,
      lines: 96,
      statements: -4
    }
  },
  collectCoverageFrom: ['src/**/{!(index|formatExample|lintExample),}.ts']
}
