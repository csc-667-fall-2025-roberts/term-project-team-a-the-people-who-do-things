// dictionary for word validation
// NOT COMPLETE

const VALID_WORDS = new Set([
    'HELLO', 'WORLD', 'GAME', 'WORD', 'PLAY', 'SCORE', 'TILE', 'BOARD',
    'CAT', 'DOG', 'HOUSE', 'TREE', 'BOOK', 'READ', 'WRITE', 'CODE',
    // Add more SHIT or make an api
]);

export function isValidWord(word) {
    return VALID_WORDS.has(word.toUpperCase());
}

export function validateWords(words) {
    const invalid = words.filter(word => !isValidWord(word));
    return {
        valid: invalid.length === 0,
        invalidWords: invalid
    };
}

export default {
    isValidWord,
    validateWords
};