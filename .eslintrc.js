module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    // Error on explicit any usage
    '@typescript-eslint/no-explicit-any': 'error',

    // Error on unused variables
    '@typescript-eslint/no-unused-vars': 'error',

    // React specific rules
    'react/no-unescaped-entities': 'error',

    // Warn on console.log (should use proper logging)
    'no-console': 'warn',

    // Error on debugger statements
    'no-debugger': 'error',
  },
  ignorePatterns: [
    '.next/',
    'node_modules/',
    'out/',
    'scripts/',
    '.eslintrc.js',
    'next.config.js',
    'tailwind.config.js',
  ],
};