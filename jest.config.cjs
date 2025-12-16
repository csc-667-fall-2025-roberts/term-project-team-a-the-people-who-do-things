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





  // 3. FORCE the compiler configuration


  transform: {


    "^.+\\.tsx?$": [


      "ts-jest",


      {


        useESM: true,


        isolatedModules: true,


        tsconfig: {


          module: "ESNext", // Use uppercase to be safe


          target: "ES2020",


          esModuleInterop: true


        }


      },


    ],


  },


};