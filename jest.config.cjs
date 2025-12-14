/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"], // 1. Treat .ts files as ESM
  transform: {
    "^.+.tsx?$": [
      "ts-jest",
      {
        useESM: true, // 2. Tell ts-jest to compile using ESM settings
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};