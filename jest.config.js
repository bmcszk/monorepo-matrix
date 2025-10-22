module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'index.js',
        '!**/node_modules/**',
        '!**/coverage/**'
    ],
    testMatch: [
        '**/*.test.js',
        '**/*.spec.js'
    ],
    verbose: true
};