module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10
    }
  },
  collectCoverageFrom: ['src/**/{!(index|formatExample|lintExample),}.ts']
}
