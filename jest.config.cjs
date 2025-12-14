/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  // 1. Use the ESM preset
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  
  // 2. Fix the .js extension imports
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  
  // 3. FORCE the compiler to use modern modules
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        // This is the critical part that fixes TS1343
        tsconfig: {
          module: "es2020", 
          target: "es2020",
          esModuleInterop: true
        }
      },
    ],
  },
};