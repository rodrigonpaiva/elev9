/** @type {import('jest').Config} */
module.exports = {
  displayName: 'mobile',
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/apps/mobile/src/**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/apps/mobile/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@elev9/api-client$': '<rootDir>/packages/api-client/src/index.ts',
    '^@elev9/api-client/(.*)$': '<rootDir>/packages/api-client/src/$1',
    '^@elev9/ui$': '<rootDir>/packages/ui/src/index.ts',
    '^@elev9/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
    '^@elev9/types$': '<rootDir>/packages/types/src/index.ts',
    '^@elev9/types/(.*)$': '<rootDir>/packages/types/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/'],
};
