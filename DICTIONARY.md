
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

```bash
npm test src/server/services/dictionary.test.ts
```



