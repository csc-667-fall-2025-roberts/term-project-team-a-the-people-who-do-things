/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  // 1. Use the ESM preset to ensure basic ESM support
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // 2. Force ts-jest to use ESM mode
        useESM: true,
        // 3. Explicitly tell TypeScript to output modern code
        tsconfig: {
          module: "esnext",
          target: "es2020"
        }
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};