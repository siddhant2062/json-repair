# Testing Documentation

## Test Suites

### 1. Backend Test Suite (`test_suite.js`)
- **60 test cases** covering all malformed JSON patterns
- **Run:** `node test_suite.js`
- **Purpose:** Validates JSONFixer can handle all known patterns

### 2. UI Test Suite (`ui-test-runner.js`)
- **63 test cases** (60 from backend + 3 UI-specific)
- **Run:** `node ui-test-runner.js`
- **Purpose:** Verifies nested JSON unwrapping works in UI context

### 3. Playwright Tests (`ui-tests.spec.js`)
- Browser automation tests (optional, requires Playwright setup)
- **Run:** `npx playwright test ui-tests.spec.js`

## Test Coverage

All 60 test cases cover various malformed JSON patterns including:
1. Unquoted keys
2. Missing commas
3. Truncated JSON
4. Single quotes
5. Python literals (True/False/None)
6. Double-escaped JSON
7. Concatenated JSON (NDJSON)
8. Unescaped nested JSON
9. Triple-nested escaped JSON
10. Mixed patterns
11. Deep nesting with multiple stringified levels
12. Array of escaped JSON strings
13. Backslash escaping
14. Comments removal
15. Garbage characters
16. **Double-quoted headers field** (TC_029)
17. Multiple consecutive commas
18. JavaScript undefined/NaN/Infinity
19. Numbers with spaces (European format)
20. Numeric keys
21. Array-style key-value pairs
22. Mixed array types missing commas
23. Missing comma after array
24. Same-line missing comma
25. Unicode escapes
26. And more...

**TC_030 (Mega Nightmare)**: Real-world JSON with ALL patterns combined - ✅ PASSES

## JSONFixer Implementation

### Single Source of Truth

**`src/lib/utils/jsonFixer.ts`** (TypeScript)
- **Used by:** 
  - Next.js application (browser/UI) - compiled by Next.js
  - Node.js test scripts - via `ts-node` runtime compilation
- **Location:** `src/lib/utils/`
- **Import in app:** `import JSONFixer from "../lib/utils/jsonFixer"`
- **Import in tests:** `require('./src/lib/utils/jsonFixer.ts').default` (with `ts-node`)

**Benefits:**
- ✅ Single source of truth - no sync issues
- ✅ Type safety in both environments
- ✅ Tests use the exact same code as production

## Running Tests

```bash
# Backend tests
node test_suite.js

# UI tests
node ui-test-runner.js

# Both
node test_suite.js && node ui-test-runner.js
```

## Test Results

✅ **All 60 backend tests pass**
✅ **All 63 UI tests pass**
✅ **Mega nightmare test (TC_030) passes**
✅ **Headers field unwrapping verified**

