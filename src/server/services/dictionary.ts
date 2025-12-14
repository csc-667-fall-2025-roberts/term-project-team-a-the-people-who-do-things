import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Use single underscores to avoid conflict with global __filename in tests
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
const WORDS_FILE_PATH = path.join(_dirname, "words.txt");

console.log("Loading dictionary...");
let VALID_WORDS: Set<string>;
let WORD_LIST: string[] = [];

try {
  const fileContent = fs.readFileSync(WORDS_FILE_PATH, "utf-8");
  WORD_LIST = fileContent
    .split("\n")
    .map((w) => w.trim().toUpperCase())
    .filter((w) => w.length > 0 && !w.startsWith("#"));

  VALID_WORDS = new Set(WORD_LIST);
} catch (error) {
  console.error(error);
  VALID_WORDS = new Set(["HELLO", "WORLD", "TEST", "SCRABBLE"]);
  WORD_LIST = Array.from(VALID_WORDS);
}

export function isValidWord(word: string): boolean {
  if (!word || typeof word !== "string") return false;
  const normalized = word.trim().toUpperCase();
  if (normalized.length === 0) return false;
  return VALID_WORDS.has(normalized);
}

export function validateWords(words: string[]): {
  valid: boolean;
  invalidWords: string[];
  validWords: string[];
} {
  const validWords: string[] = [];
  const invalidWords: string[] = [];

  for (const word of words) {
    if (isValidWord(word)) {
      validWords.push(word.toUpperCase());
    } else {
      invalidWords.push(word);
    }
  }

  return {
    valid: invalidWords.length === 0,
    invalidWords,
    validWords,
  };
}

export function getWordInfo(word: string): {
  exists: boolean;
  length: number;
  normalized: string;
} {
  const normalized = word.trim().toUpperCase();
  return {
    exists: VALID_WORDS.has(normalized),
    length: normalized.length,
    normalized,
  };
}

export function getDictionaryStats(): {
  totalWords: number;
  wordsByLength: Record<number, number>;
} {
  let _totalLength = 0;
  const wordsByLength: Record<number, number> = {};

  for (const word of WORD_LIST) {
    const len = word.length;
    _totalLength += len;
    wordsByLength[len] = (wordsByLength[len] || 0) + 1;
  }

  return {
    totalWords: WORD_LIST.length,
    wordsByLength,
  };
}

export function validateWordDetailed(word: string): {
  valid: boolean;
  word: string;
  normalized: string;
  length: number;
  error?: string;
} {
  if (!word || typeof word !== "string") {
    return {
      valid: false,
      word: word || "",
      normalized: "",
      length: 0,
      error: "Word must be a non-empty string",
    };
  }

  const normalized = word.trim().toUpperCase();

  if (normalized.length === 0) {
    return {
      valid: false,
      word,
      normalized,
      length: 0,
      error: "Word cannot be empty",
    };
  }

  if (!/^[A-Z]+$/.test(normalized)) {
    return {
      valid: false,
      word,
      normalized,
      length: normalized.length,
      error: "Word must contain only letters",
    };
  }

  const exists = VALID_WORDS.has(normalized);

  return {
    valid: exists,
    word,
    normalized,
    length: normalized.length,
    error: exists ? undefined : "Word not found in dictionary",
  };
}

export default {
  isValidWord,
  validateWords,
  getWordInfo,
  getDictionaryStats,
  validateWordDetailed,
};
