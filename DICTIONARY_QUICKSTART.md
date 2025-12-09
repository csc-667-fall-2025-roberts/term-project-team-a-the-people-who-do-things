# Dictionary Service Quick Start Guide

## Overview

The Dictionary Service is now fully integrated into your Scrabble game! It provides comprehensive word validation using a complete English lexicon loaded from `words.txt`.

## What's Been Added

### 1. Enhanced Dictionary Service (`src/server/services/dictionary.ts`)
- ✅ **Single word validation** - `isValidWord(word)`
- ✅ **Batch validation** - `validateWords(words[])`
- ✅ **Word information** - `getWordInfo(word)`
- ✅ **Find words from letters** - `findWordsFromLetters(letters[])`
- ✅ **Prefix search** - `findWordsWithPrefix(prefix)`
- ✅ **Anagram finder** - `findAnagrams(word)`
- ✅ **Blank tile support** - `validateWithBlanks(word, positions[])`
- ✅ **Dictionary stats** - `getDictionaryStats()`

### 2. REST API Routes (`src/server/routes/dictionary.ts`)
All dictionary functions are exposed via HTTP endpoints at `/api/dictionary/`

### 3. Test Suite (`src/server/services/dictionary.test.ts`)
Comprehensive tests for all dictionary functions

### 4. Documentation (`src/server/services/DICTIONARY_README.md`)
Detailed API reference with examples

## Quick Usage Examples

### In Your Game Logic

```typescript
import { isValidWord } from './services/dictionary';

// Validate a word
if (isValidWord('SCRABBLE')) {
  console.log('Valid word!');
}

// Validate multiple words
import { validateWords } from './services/dictionary';

const result = validateWords(['CAT', 'DOG', 'XYZABC']);
console.log(result);
// {
//   valid: false,
//   invalidWords: ['XYZABC'],
//   validWords: ['CAT', 'DOG']
// }
```

### Via HTTP API

```bash
# Quick word check
curl -X POST http://localhost:3000/api/dictionary/quick-check \
  -H "Content-Type: application/json" \
  -d '{"word":"HELLO"}'

# Find words from letters (for hints/suggestions)
curl -X POST http://localhost:3000/api/dictionary/find-words \
  -H "Content-Type: application/json" \
  -d '{"letters":["C","A","T","S"],"minLength":3}'

# Get dictionary statistics
curl http://localhost:3000/api/dictionary/stats

# Find anagrams
curl http://localhost:3000/api/dictionary/anagrams/LISTEN

# Autocomplete/prefix search
curl http://localhost:3000/api/dictionary/prefix/CAT?limit=10

# Validate with blank tiles
curl -X POST http://localhost:3000/api/dictionary/validate-blanks \
  -H "Content-Type: application/json" \
  -d '{"word":"C_T","blankPositions":[1]}'
```

### In Client-Side JavaScript

```javascript
// Validate a word
async function checkWord(word) {
  const response = await fetch('/api/dictionary/quick-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word })
  });
  const result = await response.json();
  return result.valid;
}

// Find possible words from player's tiles
async function findPossibleWords(tiles) {
  const response = await fetch('/api/dictionary/find-words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      letters: tiles,
      minLength: 2 
    })
  });
  const result = await response.json();
  return result.words;
}

// Autocomplete for word input
async function autocomplete(prefix) {
  const response = await fetch(`/api/dictionary/prefix/${prefix}?limit=10`);
  const result = await response.json();
  return result.words;
}
```

## Integration Points

### Already Integrated ✅
The dictionary is **already being used** in your Scrabble game engine:

```typescript
// src/server/services/scrabbleEngine.ts (line 8)
import { isValidWord } from "./dictionary.js";

// Used in validateMove method (around line 125)
for (const { word } of formedWords) {
  if (!isValidWord(word)) {
    return { valid: false, error: `Invalid word: ${word}` };
  }
}
```

### Future Enhancements You Can Add

1. **AI Player Word Selection**
   ```typescript
   import { findWordsFromLetters } from './services/dictionary';
   
   function aiSelectBestMove(tiles, board) {
     const possibleWords = findWordsFromLetters(tiles, 2);
     // Score each word and select best placement
   }
   ```

2. **Hint System**
   ```typescript
   import { findWordsFromLetters } from './services/dictionary';
   
   function getHint(playerTiles) {
     const words = findWordsFromLetters(playerTiles, 3);
     return words.slice(0, 5); // Show 5 possible words
   }
   ```

3. **Word Challenge System**
   ```typescript
   import { validateWordDetailed } from './services/dictionary';
   
   function challengeWord(word) {
     const result = validateWordDetailed(word);
     if (!result.valid) {
       return { 
         challenge: 'success', 
         error: result.error 
       };
     }
     return { challenge: 'failed' };
   }
   ```

4. **Educational Features**
   ```typescript
   import { findAnagrams } from './services/dictionary';
   
   function showAnagrams(word) {
     const anagrams = findAnagrams(word);
     // Display to player after game
   }
   ```

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dictionary/validate` | POST | Validate single word with details |
| `/api/dictionary/validate-multiple` | POST | Validate multiple words |
| `/api/dictionary/quick-check` | POST | Quick true/false validation |
| `/api/dictionary/word/:word` | GET | Get word information |
| `/api/dictionary/find-words` | POST | Find words from letters |
| `/api/dictionary/prefix/:prefix` | GET | Prefix search (autocomplete) |
| `/api/dictionary/anagrams/:word` | GET | Find anagrams |
| `/api/dictionary/can-form` | POST | Check if letters can form words |
| `/api/dictionary/stats` | GET | Dictionary statistics |
| `/api/dictionary/validate-blanks` | POST | Validate with blank tiles |

## Testing

Run the test suite:

```bash
npm test src/server/services/dictionary.test.ts
```

## Performance

- **Dictionary loading**: Happens once at server startup
- **Word validation**: O(1) lookup time using Set
- **Dictionary size**: ~178,000 words loaded into memory
- **Memory usage**: ~10-15MB for the entire dictionary

## Files Added/Modified

### New Files
- ✅ `src/server/services/dictionary.ts` - Enhanced service
- ✅ `src/server/routes/dictionary.ts` - API routes
- ✅ `src/server/services/dictionary.test.ts` - Test suite
- ✅ `src/server/services/DICTIONARY_README.md` - Full documentation
- ✅ `DICTIONARY_QUICKSTART.md` - This file

### Modified Files
- ✅ `src/server/index.ts` - Added dictionary routes
- ✅ `package.json` - Added `typecheck` script

### Existing Files (Already Using Dictionary)
- ✅ `src/server/services/scrabbleEngine.ts` - Uses `isValidWord()`
- ✅ `src/server/services/words.txt` - Word list (already existed)

## Next Steps

1. **Test the API**
   ```bash
   npm run dev
   # Visit http://localhost:3000/api/dictionary/stats
   ```

2. **Add to Frontend**
   - Create a word challenge button
   - Add autocomplete to chat
   - Show word hints during gameplay

3. **Enhance Game Features**
   - Implement AI opponent using `findWordsFromLetters()`
   - Add practice mode with hints
   - Show player statistics (words formed, anagrams found)

## Support

For detailed API documentation, see:
- `src/server/services/DICTIONARY_README.md` - Complete API reference
- `src/server/services/dictionary.test.ts` - Usage examples in tests

## Common Use Cases

### 1. Validate a player's move
```typescript
const { word } = formedWord;
if (!isValidWord(word)) {
  throw new Error(`Invalid word: ${word}`);
}
```

### 2. Show hints to player
```typescript
const hints = findWordsFromLetters(playerTiles, 3, 7);
console.log(`You can make: ${hints.slice(0, 5).join(', ')}`);
```

### 3. AI opponent move generation
```typescript
const possibleWords = findWordsFromLetters(aiTiles);
const bestMove = calculateBestPlacement(possibleWords, board);
```

### 4. Educational post-game analysis
```typescript
const anagrams = findAnagrams(playerWord);
console.log(`Other words you could have made: ${anagrams.join(', ')}`);
```

---

**Your dictionary service is ready to use!** 🎉

The service is already integrated into your game's word validation. All the new API endpoints are live at `http://localhost:3000/api/dictionary/`.