// dictionary for word validation
// NOT COMPLETE

const VALID_WORDS = new Set([
  "HELLO",
  "WORLD",
  "GAME",
  "WORD",
  "PLAY",
  "SCORE",
  "TILE",
  "BOARD",
  "CAT",
  "DOG",
  "HOUSE",
  "TREE",
  "BOOK",
  "READ",
  "WRITE",
  "CODE",
  //TODO Add more SHIT or make an api
]);

export function isValidWord(word: string): boolean {
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
