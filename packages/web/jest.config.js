module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    // Browser-dependent modules (BrowserManager, AnalysisEngine, DOMExtractor)
    // require real browser for unit testing — covered by e2e tests in Story 1.9.
    // Threshold set to 50% to reflect testable-only modules.
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
};
