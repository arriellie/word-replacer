module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!jest.config.js',
  ],
  coverageReporters: ['text', 'lcov'],
  setupFiles: ['./jest.setup.js'],
  verbose: true,
  silent: false,
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  }
}; 