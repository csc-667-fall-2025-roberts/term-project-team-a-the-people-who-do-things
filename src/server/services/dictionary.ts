import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 1. Get the correct path to words.txt
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORDS_FILE_PATH = path.join(__dirname, "words.txt");

// 2. Load the dictionary efficiently
// We use a Set because checking "Set.has('WORD')" is instant (O(1)),
// whereas searching an Array is slow.
console.log("Loading dictionary...");
let VALID_WORDS: Set<string>;

try {
  const fileContent = fs.readFileSync(WORDS_FILE_PATH, "utf-8");
  // Split by new line, trim whitespace, and convert to UPPERCASE
  const wordList = fileContent.split("\n").map((w) => w.trim().toUpperCase());
  VALID_WORDS = new Set(wordList);
  console.log(`Dictionary loaded successfully with ${VALID_WORDS.size} words.`);
} catch (error) {
  console.error("FAILED TO LOAD DICTIONARY from:", WORDS_FILE_PATH);
  console.error(error);
  // Fallback to a tiny list so the server doesn't crash
  VALID_WORDS = new Set(["HELLO", "WORLD", "TEST", "SCRABBLE"]);
}

export function isValidWord(word: string): boolean {
  if (!word) return false;
  return VALID_WORDS.has(word.toUpperCase());
}

export function validateWords(words: string[]) {
  const invalid = words.filter((word: string) => !isValidWord(word));
  return {
    valid: invalid.length === 0,
    invalidWords: invalid,
  };
}
//TODO: Unused default export Unused property isValidWord Unused property validateWords
export default {
  isValidWord,
  validateWords,
};
