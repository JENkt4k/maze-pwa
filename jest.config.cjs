/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Where tests / sources live
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Mirror TS path aliases here
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1'
  },

  // Use transform (not deprecated globals) and force CJS just for Jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS' } }]
  }
};
