# JSON Auto-Repair Logic Documentation

## Overview

This document explains the automatic JSON repair system implemented in the JSON Repair editor. The system automatically detects, wraps, and repairs invalid JSON content when users paste it into the editor, matching the behavior of JSON Editor Online.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Wrapper Detection System](#wrapper-detection-system)
3. [Repair Strategies](#repair-strategies)
4. [Flow Diagram](#flow-diagram)
5. [Examples](#examples)
6. [Implementation Details](#implementation-details)

---

## Architecture Overview

The auto-repair system follows a multi-step approach:

```
Paste → Format → Validate → Detect Wrapper → Wrap → Repair → Format → Display
```

### Key Components

1. **Monaco Editor Format**: Initial formatting attempt using Monaco's built-in formatter
2. **Wrapper Detection**: Intelligent detection of whether content needs `{}` or `[]` wrapper
3. **jsonrepair Library**: External library that repairs broken JSON syntax
4. **Fallback Strategies**: Multiple fallback approaches if initial repair fails

---

## Wrapper Detection System

### Purpose

The wrapper detection system determines whether unwrapped JSON content should be wrapped in:
- **Curly braces `{}`**: For objects (key-value pairs)
- **Square brackets `[]`**: For arrays (comma-separated items)

### Detection Priority Order

The system uses a priority-based detection algorithm:

#### Priority 1: Key Pattern at Start (Highest Priority)

**Pattern**: Content starts with a key followed by colon/equals
- `"key":`
- `'key':`
- `key:`
- `key=`

**Example**:
```json
"response": "{'content': [...]}"
```

**Detection**: ✅ Key pattern detected
**Action**: Wrap in `{}`
**Result**: `{"response": "{'content': [...]}"}`

#### Priority 2: Key-Value Pairs Detection

**Pattern**: Content contains colons (`:`) outside of strings that form key-value pairs

**Algorithm**:
1. Scan content character by character
2. Track string boundaries (respects escaped quotes)
3. When finding `:` outside strings:
   - Look backwards for key pattern
   - Verify key is quoted string or identifier
   - Count key-value patterns

**Example**:
```json
name: "John", age: 30, city: "NYC"
```

**Detection**: ✅ Key-value pairs found
**Action**: Wrap in `{}`
**Result**: `{name: "John", age: 30, city: "NYC"}`

**Threshold**: If `keyValuePatternCount >= colonCount * 0.5`, treat as object

#### Priority 3: Array-Like Pattern

**Pattern**: Content contains commas but no/few key-value pairs

**Example**:
```json
item1, item2, item3, item4
```

**Detection**: ✅ Array-like pattern (commas without key-value pairs)
**Action**: Wrap in `[]`
**Result**: `[item1, item2, item3, item4]`

**Threshold**: If `keyValuePatternCount === 0` or `keyValuePatternCount < colonCount * 0.3`

#### Priority 4: Default Fallback

**Pattern**: Unclear structure

**Action**: Default to `{}` (objects are more common in JSON)

---

## Repair Strategies

The system uses different strategies based on whether content is already wrapped or not.

### Strategy A: Content Already Wrapped

When content is already wrapped in `{}` or `[]`:

#### Step 1: Direct jsonrepair
```typescript
jsonrepair(wrappedContent) → Parse → Success!
```

#### Step 2: Alternative Wrapper (if Step 1 fails)
- If wrapped in `{}` → Try wrapping in `[]`
- If wrapped in `[]` → Try wrapping in `{}`
- Special handling for NDJSON patterns (multiple concatenated objects)

#### Step 3: Final Fallback
- Call `formatDocument` again
- Show informational message if repair incomplete

### Strategy B: Content Not Wrapped

When content is not wrapped:

#### Step 1: Direct jsonrepair
```typescript
jsonrepair(unwrappedContent) → Parse
```
Try repairing without wrapping first.

#### Step 2: Auto-Detect and Wrap
1. Detect wrapper type using `detectWrapperType()`
2. Wrap content: `{content}` or `[content]`
3. Handle NDJSON: Detect `}{` pattern → Add commas → Wrap in `[]`
4. Run jsonrepair on wrapped content

#### Step 3: Alternative Wrapper (if Step 2 fails)
- If object wrapper failed → Try array wrapper
- If array wrapper failed → Try object wrapper

#### Step 4: Additional Repair Attempt
- Show wrapped content in editor
- Try jsonrepair again after short delay
- If fails → Call `formatDocument` as final fallback

---

## Flow Diagram

```
┌─────────────────────────────────────┐
│   User Pastes Content                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Step 1: Monaco formatDocument     │
│   (Initial formatting attempt)      │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Valid JSON?  │
        └──┬───────┬───┘
           │       │
        YES│       │NO
           │       │
           ▼       ▼
      ┌────────┐ ┌──────────────────────┐
      │  DONE  │ │ Step 2: Check Wrapper│
      └────────┘ └──────────┬───────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Already Wrapped?│
                    └───┬───────┬───┘
                        │       │
                     YES│       │NO
                        │       │
                        ▼       ▼
            ┌──────────────┐ ┌──────────────────────┐
            │ Strategy A   │ │ Strategy B           │
            │ (Wrapped)    │ │ (Unwrapped)          │
            └──────┬───────┘ └──────────┬───────────┘
                   │                    │
                   │                    ▼
                   │            ┌──────────────────┐
                   │            │ detectWrapperType│
                   │            │                  │
                   │            │ Priority 1:      │
                   │            │ Key pattern?      │
                   │            │                  │
                   │            │ Priority 2:      │
                   │            │ Key-value pairs? │
                   │            │                  │
                   │            │ Priority 3:      │
                   │            │ Array-like?      │
                   │            │                  │
                   │            │ Priority 4:      │
                   │            │ Default: {}       │
                   │            └────────┬─────────┘
                   │                     │
                   │                     ▼
                   │            ┌──────────────────┐
                   │            │ Wrap: {} or []    │
                   │            └────────┬─────────┘
                   │                     │
                   ▼                     ▼
            ┌──────────────────────────────────┐
            │  Run jsonrepair on wrapped content │
            └──────────────┬─────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Parse Success?│
                    └───┬───────┬───┘
                        │       │
                     YES│       │NO
                        │       │
                        ▼       ▼
            ┌──────────────┐ ┌──────────────────┐
            │ Format & Show│ │ Try Alternative  │
            │   SUCCESS!   │ │   Wrapper        │
            └──────────────┘ └────────┬─────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │ Final Fallback│
                              │ formatDocument│
                              └──────────────┘
```

---

## Examples

### Example 1: Key Pattern at Start

**Input**:
```json
"response": "{'content': [{'type': 'text', 'text': '...'}]}"
```

**Detection Process**:
1. ✅ Priority 1: Key pattern `"response":` detected at start
2. **Action**: Wrap in `{}`
3. **Wrapped**: `{"response": "{'content': [{'type': 'text', 'text': '...'}]}"}`
4. **Repair**: jsonrepair fixes inner content and unwraps nested JSON
5. **Output**: 
```json
{
  "response": {
    "content": [
      {
        "type": "text",
        "text": "..."
      }
    ]
  }
}
```

### Example 2: Key-Value Pairs

**Input**:
```json
name: "John", age: 30, city: "NYC"
```

**Detection Process**:
1. ❌ Priority 1: No key pattern at start
2. ✅ Priority 2: Key-value pairs detected (3 patterns: `name:`, `age:`, `city:`)
3. **Action**: Wrap in `{}`
4. **Wrapped**: `{name: "John", age: 30, city: "NYC"}`
5. **Repair**: jsonrepair adds quotes to keys
6. **Output**:
```json
{
  "name": "John",
  "age": 30,
  "city": "NYC"
}
```

### Example 3: Array-Like Pattern

**Input**:
```json
item1, item2, item3, item4
```

**Detection Process**:
1. ❌ Priority 1: No key pattern at start
2. ❌ Priority 2: No key-value pairs (no colons)
3. ✅ Priority 3: Array-like pattern (commas without key-value pairs)
4. **Action**: Wrap in `[]`
5. **Wrapped**: `[item1, item2, item3, item4]`
6. **Repair**: jsonrepair adds quotes to items
7. **Output**:
```json
["item1", "item2", "item3", "item4"]
```

### Example 4: NDJSON (Multiple Objects)

**Input**:
```json
{a:1}{b:2}{c:3}
```

**Detection Process**:
1. ✅ NDJSON pattern detected: `}{` pattern found
2. **Action**: Add commas between objects → Wrap in `[]`
3. **Wrapped**: `[{a:1},{b:2},{c:3}]`
4. **Repair**: jsonrepair fixes each object
5. **Output**:
```json
[
  {"a": 1},
  {"b": 2},
  {"c": 3}
]
```

### Example 5: Already Wrapped (Object)

**Input**:
```json
{"name": "John", "age": 30
```

**Detection Process**:
1. ✅ Already wrapped in `{}` (detected by `isAlreadyWrapped()`)
2. **Action**: Run jsonrepair directly (no double-wrapping)
3. **Repair**: jsonrepair adds missing closing brace
4. **Output**:
```json
{
  "name": "John",
  "age": 30
}
```

### Example 6: Ambiguous Content

**Input**:
```json
value1, value2, value3
```

**Detection Process**:
1. ❌ Priority 1: No key pattern
2. ❌ Priority 2: No key-value pairs
3. ✅ Priority 3: Array-like (commas, no colons)
4. **Action**: Wrap in `[]`
5. **Wrapped**: `[value1, value2, value3]`
6. **Repair**: jsonrepair adds quotes
7. **Output**:
```json
["value1", "value2", "value3"]
```

---

## Implementation Details

### Key Functions

#### `isAlreadyWrapped(content: string)`

Checks if content is already wrapped in `{}` or `[]`.

```typescript
function isAlreadyWrapped(content: string): {
  wrapped: boolean;
  type: "object" | "array" | null;
}
```

**Returns**:
- `{wrapped: true, type: "object"}` if wrapped in `{}`
- `{wrapped: true, type: "array"}` if wrapped in `[]`
- `{wrapped: false, type: null}` if not wrapped

#### `detectWrapperType(content: string)`

Detects what wrapper type should be used for unwrapped content.

```typescript
function detectWrapperType(content: string): "object" | "array" | null
```

**Returns**:
- `"object"` if content should be wrapped in `{}`
- `"array"` if content should be wrapped in `[]`
- `null` if already wrapped (let `isAlreadyWrapped` handle it)

**Detection Algorithm**:
1. Check if already wrapped → return `null`
2. Check key pattern at start → return `"object"`
3. Scan for key-value pairs → return `"object"` if found
4. Check for array-like pattern → return `"array"` if found
5. Default → return `"object"`

### String Parsing Logic

The key-value pair detection uses careful string parsing:

```typescript
// Track string boundaries
let inString = false;
let escapeNext = false;

// Scan character by character
for (let i = 0; i < content.length; i++) {
  // Handle escape sequences
  if (escapeNext) {
    escapeNext = false;
    continue;
  }
  
  // Track string boundaries
  if (char === "\\") escapeNext = true;
  if (char === '"' || char === "'") inString = !inString;
  
  // Only check for colons outside strings
  if (!inString && char === ":") {
    // Verify key pattern before colon
    // ...
  }
}
```

This ensures colons inside string values are not mistaken for key-value separators.

### Integration with jsonrepair

The `jsonrepair` library is used for actual JSON repair:

```typescript
import { jsonrepair } from "jsonrepair";

// Repair wrapped content
const repaired = jsonrepair(wrappedContent);
const parsed = JSON.parse(repaired);
```

**jsonrepair capabilities**:
- Fixes missing quotes
- Adds missing commas
- Fixes trailing commas
- Handles single quotes
- Fixes escape sequences
- And more...

### Error Handling

The system includes comprehensive error handling:

1. **Try-Catch Blocks**: Each repair attempt is wrapped in try-catch
2. **Fallback Strategies**: Multiple fallback approaches
3. **User Feedback**: Toast notifications for success/failure
4. **Graceful Degradation**: Falls back to `formatDocument` if all repairs fail

### Performance Considerations

1. **Early Exit**: Stops as soon as repair succeeds
2. **Efficient Parsing**: Character-by-character parsing only when needed
3. **Caching**: Wrapper detection results are not cached (content changes on each paste)
4. **Async Operations**: Uses `setTimeout` for non-blocking operations

---

## Best Practices

### When to Use Auto-Repair

✅ **Good Use Cases**:
- Pasting JSON from external sources
- Copying JSON from logs or APIs
- Fixing malformed JSON quickly
- Handling nested stringified JSON

❌ **Not Suitable For**:
- Very large files (>10MB) - may cause performance issues
- Binary data - not JSON
- Already valid JSON - unnecessary processing

### User Experience

1. **Immediate Feedback**: Toast notifications show repair status
2. **Non-Blocking**: Repair happens asynchronously
3. **Preserves Content**: Original content is preserved if repair fails
4. **Manual Override**: Users can use "Repair" button if auto-repair fails

---

## Troubleshooting

### Common Issues

#### Issue: Content not being repaired

**Possible Causes**:
1. Content is too malformed
2. Wrapper detection failed
3. jsonrepair library limitation

**Solutions**:
1. Try manually wrapping in `{}` or `[]`
2. Use the "Repair" button
3. Check browser console for error messages

#### Issue: Wrong wrapper type detected

**Possible Causes**:
1. Ambiguous content structure
2. Edge case not handled

**Solutions**:
1. System tries alternative wrapper automatically
2. Manually wrap content before pasting
3. Report edge case for improvement

#### Issue: Performance issues with large content

**Possible Causes**:
1. Large JSON files (>10MB)
2. Deeply nested structures

**Solutions**:
1. Split large files into smaller chunks
2. Use "Repair" button instead of auto-repair
3. Consider server-side processing for very large files

---

## Future Improvements

Potential enhancements to the auto-repair system:

1. **Machine Learning**: Use ML to better detect wrapper types
2. **Context Awareness**: Remember user preferences for wrapper types
3. **Batch Processing**: Handle multiple JSON objects more efficiently
4. **Schema Validation**: Validate repaired JSON against schemas
5. **Performance Optimization**: Optimize for very large files
6. **Better Error Messages**: More specific error messages for users

---

## References

- [jsonrepair Library](https://github.com/josdejong/jsonrepair)
- [JSON Editor Online](https://jsoneditoronline.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [JSON Specification](https://www.json.org/)

---

## Version History

- **v1.0.0** (Current): Initial implementation with wrapper detection and multi-strategy repair

---

## Contributing

When contributing to the auto-repair system:

1. Test with various JSON formats
2. Ensure backward compatibility
3. Add comprehensive error handling
4. Update this documentation
5. Add unit tests for new features

---

**Last Updated**: 2025-01-09
**Maintainer**: JSON Repair Team

