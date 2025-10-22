module.exports = {
    env: {
        node: true,
        es6: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        'no-console': 'off'
    }
};