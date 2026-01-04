  // Enable TypeScript support with proper configuration
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true
  }
});

// Import TypeScript version
const JSONFixer = require('./src/lib/utils/jsonFixer.ts').default;

/**
 * JSON Formatter Test Suite
 * 
 * This suite contains all the "nightmare" patterns that have been identified
 * and fixed. Each test case represents a real-world scenario where JSON was
 * malformed in some way.
 * 
 * Test Case Structure:
 * - id: Unique test case identifier
 * - name: Short descriptive name
 * - description: Detailed description of what's being tested
 * - input: The malformed JSON string
 * - expectedToPass: Whether the formatter should successfully fix this JSON
 */

const testCases = [
  {
    id: 'TC_030',
    name: 'MEGA NIGHTMARE: Real-World JSON with ALL 29 Patterns',
    description: 'User\'s complex real-world API log JSON broken with ALL 29 patterns from test suite combined',
    input: "{\n  // Pattern 1: Comments\n  extraInfo: 'Downstream Info'  // Pattern 3: Single quotes + Pattern 2: Unquoted key\n  // Pattern 4: Missing comma\n  req: \"{\\\"requestType\\\":\\\"POST\\\",\\\"request\\\":null}\"  // Pattern 8: Unescaped nested JSON\n  request: null  // Pattern 2: Unquoted key\n  // Pattern 4: Missing comma\n  requestBody: \"{\\\"requisitionId\\\":\\\"613484\\\",\\\"referenceNumber\\\":\\\"1173263\\\"}\"  // Pattern 2: Unquoted key + Pattern 8: Unescaped nested\n  response: \"{\\\"status\\\":\\\"failed\\\",\\\"data\\\":{}}\"  // Pattern 2: Unquoted key\n  level: 'INFO'  // Pattern 3: Single quotes\n  servNm: '/RV1/Accommodation/evaluateHotelPolicyListing'  // Pattern 2: Unquoted key\n  crId: \"5a22aa84-a0b1-4c56-8bd1-c9a9e67efe6c\"  // Pattern 2: Unquoted key\n  className: 'com.b2b.common.httpclient.util.HTTPResponseUtil'  // Pattern 3: Single quotes\n  logId: \"311bff03-e019-42ed-924f-f3c62a469501\"  // Pattern 2: Unquoted key\n  timestamp: \"2025-12-02 12:07:24.145+0530\"  // Pattern 2: Unquoted key\n  // Pattern 6: Double-quoted headers field (the main issue)\n  headers: \"\\\"{\\\\\\\"x-gommt-pfm\\\\\\\":\\\\\\\"DESKTOP\\\\\\\",\\\\\\\"x-gommt-os\\\\\\\":\\\\\\\"Windows\\\\\\\"}\\\"\"\n  asyncLogging: True  // Pattern 5: Python literal\n  requestId: \"REQ_c51761c1-40d3-4a53-8eb5-a246125bf3f5\"  // Pattern 2: Unquoted key\n  requestTimestamp: \"2025-12-02 12:07:23.963+0530\"  // Pattern 2: Unquoted key\n  responseTimestamp: \"2025-12-02 12:07:24.143+0530\"  // Pattern 2: Unquoted key\n  requestProcessedTime: \"179 ms\"  // Pattern 2: Unquoted key\n  // Pattern 18: Multiple consecutive commas\n  extraField1: 123,, extraField2: 456,,, extraField3: 789\n  // Pattern 19: JavaScript undefined/NaN/Infinity\n  undefinedField: undefined\n  nanValue: NaN\n  infinityValue: Infinity\n  negativeInfinity: -Infinity\n  // Pattern 20: Numbers with spaces (European format)\n  population: 1 000 000\n  smallNumber: 10 000\n  // Pattern 21: Numeric keys\n  2024: \"year\"\n  2025: \"next year\"\n  // Pattern 22: Array-style key-value (simplified format)\n  arrayStyle: [20:doe 30:test]\n  // Pattern 23: Mixed array types missing commas\n  mixedArray: [1 \"two\" true null {\"key\": \"value\"}]\n  // Pattern 24: Garbage characters\n  garbageField: \"value\" [ ] } ,\n  // Pattern 25: Missing comma after array\n  items: [{\"id\": 1} {\"id\": 2}] \"nextField\": \"value\"\n  // Pattern 26: Same-line missing comma\n  obj1: {\"a\": 1} obj2: {\"b\": 2}\n  // Pattern 27: Unicode escapes\n  unicodeField: \"\\u0041lpha\\u002D\\u0042eta\"\n  // Pattern 28: Backslash hell\n  path: \"C:\\\\Users\\\\Admin\\\\file.txt\"\n  regex: \"\\\\d{4}-\\\\d{2}\"\n  // Pattern 29: Deeply escaped nested JSON\n  deeplyEscaped: \"{\\\"level1\\\": \\\"{\\\\\\\"level2\\\\\\\": \\\\\\\"value\\\\\\\"}\\\"}\"\n}",
    expectedToPass: true
  },
  {
    id: 'TC_001',
    name: 'Unquoted key after comment + deeply escaped nested JSON',
    description: 'JSON with unquoted key (delay: 500) after comment and deeply escaped nested JSON string',
    input: `{
  "transactionId": "TX-48293-A",
  "data_payload": {
    "sender": "John\\tDoe",
    "receiver": "Jane\\nSmith",
    "settings": {
      "mode": "async",
      // **DELIBERATE ERROR: The key 'delay' is not quoted!**
      delay: 500,
      "flags": [
        "F_INIT",
        "F_SECURE",
        "F_FINAL"
      ]
    },
    "deep_escaped_field": "This string contains a quoted segment: \\"The result was an error code: \\\\\\"E_404_NOT_FOUND\\\\\\"\\". This is a test of deeply nested escaping of quotes and backslashes (\\\\)."
  },
  "metadata_history": [
    {
      "step": 1,
      "name": "Validation",
      "status": true,
      "result": 1
    },
    {
      "step": 2,
      "name": "Transformation",
      "status": "true",
      "result": "2"
    }
  ],
  "nested_json_string": "{\\"type\\":\\"CONFIG_UPDATE\\",\\"priority\\":10,\\"details\\":{\\"service\\":\\"auth_service\\",\\"timestamp\\":\\"2025-11-19T12:18:11Z\\",\\"isCritical\\":true}}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_002',
    name: 'Missing comma between array objects + unquoted key',
    description: 'JSON with missing comma between objects in array and unquoted key in nested object',
    input: `{
  "test_case_id": "TC_BROKEN_NEST_001",
  "data_version": 2.1,
  "config_parameters": {
    "max_retries": 5,
    "timeout_ms": 3000,
    "feature_flags": [
      {
        "name": "enable_v3",
        "status": true
      },
      {
        "name": "logging_level",
        "value": "DEBUG"
      }
    ]
  },
  "user_sessions": [
    {
      "session_id": "SESS_A1B2",
      "timestamp": 1732000000,
      "events_log": [
        "login_success",
        "view_dashboard"
      ]
    }
    {
      "session_id": "SESS_C3D4",
      "timestamp": 1732000010,
      "events_log": [
        "load_report",
        "export_data"
      ],
      "metrics": {
        unquoted_key: 99.99,
        "duration_sec": 12.5
      }
    }
  ],
  "is_valid": false
}`,
    expectedToPass: true
  },
  {
    id: 'TC_003',
    name: 'Network Cutoff (Truncated JSON)',
    description: 'Truncated JSON with missing closing braces/brackets',
    input: `{
  "request_id": "REQ_XYZ789",
  "data": {
    "items": [
      {"id": 1, "name": "Alpha"},
      {"id": 2, "name": "Beta"`,
    expectedToPass: true
  },
  {
    id: 'TC_004',
    name: 'Lazy Human (Implicit Syntax)',
    description: 'Unquoted keys, single quotes, missing commas',
    input: `{
  request_id: 'REQ_ABC123'
  status: 'pending'
  items: [
    {id: 1 name: 'First'}
    {id: 2 name: 'Second'}
  ]
}`,
    expectedToPass: true
  },
  {
    id: 'TC_005',
    name: 'Python Dump (Wrong Literals)',
    description: 'Python-style literals: True/False/None, tuples, hex numbers',
    input: `{
  'success': True,
  'error': None,
  'active': False,
  'coordinates': (102.5, 45.3),
  'error_code': 0x1A4
}`,
    expectedToPass: true
  },
  {
    id: 'TC_006',
    name: 'Double-Escaped Disaster',
    description: 'JSON stringified multiple times',
    input: '"{\\\"data\\\": \\\"{\\\\\\\"id\\\\\\\": 1, \\\\\\\"name\\\\\\\": \\\\\\\"Test\\\\\\\"}\\\"}"',
    expectedToPass: true
  },
  {
    id: 'TC_007',
    name: 'Concatenated Stream (NDJSON Error)',
    description: 'Multiple JSON objects without array wrapper',
    input: `{"id": 1, "status": "ok"}
{"id": 2, "status": "error"}`,
    expectedToPass: true
  },
  {
    id: 'TC_008',
    name: 'Unescaped Nested JSON (API Response Bug)',
    description: 'Stringified JSON with unescaped quotes inside string value',
    input: `{
  "status": "SUCCESS",
  "corporateData": "{"agencyName": "ACME Corporation", "agencyUUID": "ABC123XYZ", "agentRole": "admin"}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_009',
    name: 'Triple-Nested Escaped JSON',
    description: 'JSON stringified three times with increasing escape levels',
    input: '"{\\\\\\\"level1\\\\\\\": \\\\\\"{\\\\\\\\\\\\\\\"level2\\\\\\\\\\\\\\\": \\\\\\\\\\\\\\\"value\\\\\\\\\\\\\\\"}\\\\\\\"}"',
    expectedToPass: true
  },
  {
    id: 'TC_010',
    name: 'Mixed Nightmare: Escaped + Unquoted + Missing Commas',
    description: 'Combines escaped nested JSON, unquoted keys, and missing commas',
    input: `{
  "outer_key": "value1"
  nested_unquoted: {
    "inner": "{"escaped": "json", "inside": true}"
    another_key: 123
  }
  "array": [
    {"id": 1}
    {"id": 2}
  ]
}`,
    expectedToPass: true
  },
  {
    id: 'TC_011',
    name: 'Deep Nesting with Multiple Stringified Levels',
    description: 'Multiple nested objects with stringified JSON at different levels',
    input: `{
  "level1": {
    "data": "{"level2": {"nested": "{"level3": "deep value"}"}}"
  },
  "config": {
    "settings": "{"mode": "production", "flags": {"enabled": true}}"
  }
}`,
    expectedToPass: true
  },
  {
    id: 'TC_012',
    name: 'Array of Escaped JSON Strings',
    description: 'Array containing multiple stringified JSON objects',
    input: `{
  "items": [
    "{"id": 1, "name": "First Item"}",
    "{"id": 2, "name": "Second Item"}",
    "{"id": 3, "name": "Third Item"}"
  ]
}`,
    expectedToPass: true
  },
  {
    id: 'TC_013',
    name: 'Mega Nightmare: All Patterns Combined',
    description: 'Triple-escaped JSON + unquoted keys + missing commas + arrow comments + Python literals',
    input: `{
  status: 'active' <-- This key is unquoted!
  data: {
    is_valid: True,  # Python bool
    user_info: "{"username": "testuser", "email": "user@example.com"}" <-- Unescaped nested JSON
    settings: {
      theme: dark
      "notifications": True
    }
  }
  "items": [
    {id: 1 name: 'First'}
    {id: 2 name: 'Second'}
  ],
  "deeply_escaped": "{\\"config\\": \\"{\\\\\\"nested\\\\\\": \\\\\\"value\\\\\\"}\\"}",
  coordinates: (10.5, 20.3)
}`,
    expectedToPass: true
  },
  {
    id: 'TC_014',
    name: 'Backslash Hell (Multiple Escape Levels)',
    description: 'Testing extreme backslash escaping scenarios',
    input: `{
  "path": "C:\\\\Users\\\\UserName\\\\Documents\\\\file.txt",
  "regex": "\\\\d{4}-\\\\d{2}-\\\\d{2}",
  "nested_escape": "{\\"key\\": \\"value with \\\\\\"quotes\\\\\\" inside\\"}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_015',
    name: 'Real-World API Response (Kafka Event)',
    description: 'Complex real-world scenario with nested escaped JSON from message queue',
    input: `{
  "eventId": "evt_123456",
  "timestamp": 1732000000,
  eventType: "USER_ACTION" <-- unquoted
  "payload": "{"action": "purchase", "metadata": "{"userId": 12345, "items": [{"id": "A1", "qty": 2}, {"id": "B2", "qty": 1}]}"}"
  "headers": {
    "source": "web-app",
    trace_id: "abc-def-ghi", <-- unquoted
    "span_id": "xyz-123"
  }
}`,
    expectedToPass: true
  },
  {
    id: 'TC_016',
    name: 'Edge Case: Empty and Null in Escaped JSON',
    description: 'Escaped JSON with null values, empty objects, and empty arrays',
    input: `{
  "data": "{"empty_obj": {}, "null_val": null, "empty_arr": [], "nested": "{\\"also_null\\": null}"}",
  "status": null,
  "config": {}
}`,
    expectedToPass: true
  },
  {
    id: 'TC_017',
    name: 'Same-Line Missing Comma (Complex Nesting)',
    description: 'Missing comma between objects on same line with deep nesting: }]}} {',
    input: '{"rootKey":"RootValue","config":{"mode":"\\u0041ctive","version":2.0,"settings":[{"name":"param1","value":100} , {"name":"param2", "value": "String\\tWith\\n\\tTabsAndNewlines"}],"is_enabled":true},"dataArray":[{"id":9001,"record":{"status":"\\u0045rror","timestamp":1732100000},"nestedStructure":{"level3":{unquotedKey:"broken"},"level4":[{"item_id":10,"description":"\\u0044ouble\\u0044ash\\u003a\\u002D\\u002D\\u002D"}]}} {"id":9002,"record":{"status":"OK","timestamp":1732100010},"nestedStructure":{"level3":{"keyB":2.5},"level4":[]}}]}',
    expectedToPass: true
  },
  {
    id: 'TC_018',
    name: 'Multiple Consecutive Commas',
    description: 'Extra commas between elements (copy-paste error)',
    input: '{"a": 1,, "b": 2,,, "c": 3}',
    expectedToPass: true
  },
  {
    id: 'TC_019',
    name: 'JavaScript Undefined Values',
    description: 'undefined keyword from JavaScript object dumps',
    input: '{"a": undefined, "b": null, "c": undefined}',
    expectedToPass: true
  },
  {
    id: 'TC_020',
    name: 'JavaScript NaN and Infinity',
    description: 'JavaScript numeric edge cases',
    input: '{"nan": NaN, "inf": Infinity, "ninf": -Infinity}',
    expectedToPass: true
  },
  {
    id: 'TC_021',
    name: 'Mixed Array Types - All Missing Commas',
    description: 'Array with different types, all commas missing',
    input: '[1 "two" true null {"key": "value"}]',
    expectedToPass: true
  },
  {
    id: 'TC_022',
    name: 'Numbers with Spaces (European Format)',
    description: 'European-style number formatting with space separators',
    input: '{"population": 1 000 000, "small": 10 000}',
    expectedToPass: true
  },
  {
    id: 'TC_023',
    name: 'Same-Line Missing Comma After Brace (} "key")',
    description: 'Missing comma between closing brace and next property on same line',
    input: '{"session_data":{"id":"SESS\\u002DXYZ\\u002D123","agent_id":null,"ts":1732100000,"metrics":[{"key":"\\u0043ount","value":550.99},{"key":"\\u0044uration","value":12.5,"unit":"\\u0053econds"}],"events":[{"event_name":"\\u004Coad","time_ms":100},{"event_name":"\\u0046etch","time_ms":250}],"system_config":{"param_a":true,"param_b":-1,"sub_config":{"nested_depth":6,bad_key:"broken"}},"array_of_arrays":[[1,2,3],[4,5,6],["a","b"]]} "status":"\\u0046ailed"}',
    expectedToPass: true
  },
  {
    id: 'TC_024',
    name: 'Garbage Characters Inside Structure (} [ ] })',
    description: 'JSON with garbage brackets/braces inserted between valid closing braces and trailing garbage',
    input: '{"root":{"id":1,"data":[{"name":"\\u0041lpha\\u002D\\u0043omplex","value":999.99} {"name":"\\u0042eta","value":42.0}],"config":{"version":3.1,final_key:"\\u0053uccess","details":{"setting":true,"flag":"\\uD800\\u0041"},"extra":"value"},"timestamp":1732117800} [ ] } ,',
    expectedToPass: true
  },
  {
    id: 'TC_025',
    name: 'Multiple Missing Commas + Text Garbage (END_OF_DATA)',
    description: 'JSON with missing commas after array (] "key"), between properties ("val" "key"), unquoted value, wrong bracket (] vs }), and trailing text garbage',
    input: '{"session_id": 999123,"user_data": {"name": "Test\\nUser", "status": true,"items": [ {"id": 1, unquotedKey: "valueA"}, {"id": 2, "valueB": 42.5 } ] "extra_data": "corrupted" "final_flag": maybeTrue} "timestamp": 1732118400 ] END_OF_DATA',
    expectedToPass: true
  },
  {
    id: 'TC_026',
    name: 'Numeric Keys (Pure Numbers)',
    description: 'JSON with numeric keys that need to be quoted',
    input: '{20:doe}',
    expectedToPass: true
  },
  {
    id: 'TC_027',
    name: 'Array-Style Key-Value Pair ([key:value])',
    description: 'Invalid array syntax with key:value pair - should convert to object',
    input: '[20:doe]',
    expectedToPass: true
  },
  {
    id: 'TC_028',
    name: 'Ultimate Nightmare - ALL Patterns Combined (Simplified)',
    description: 'Combines multiple patterns: unquoted values, garbage brackets, missing commas, wrong brackets, text garbage - too malformed to repair',
    input: '{\n  "level1": {\n    unquoted: test\n  } { }\n"status": ok\n] END',
    expectedToPass: false
  },
  {
    id: 'TC_029',
    name: 'Double-Quoted Headers Field (Real-World API Log)',
    description: 'Headers field as double-quoted JSON string - common in API logs and HTTP responses',
    input: `{
  "extraInfo": "Downstream Info",
  "req": "{\\"requestType\\":\\"POST\\",\\"headers\\":{\\"x-api-key\\":\\"test123\\"}}",
  "headers": "\\"{\\\\\\"x-platform\\\\\\":\\\\\\"DESKTOP\\\\\\",\\\\\\"x-os\\\\\\":\\\\\\"Windows\\\\\\"}\\"",
  "response": "{\\"status\\":\\"success\\"}",
  "level": "INFO"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_031',
    name: 'Missing } before , in array (Real-World API Log)',
    description: 'Object in array missing closing } before comma - common copy-paste error in API responses',
    input: `{
  "inclusions": [
    {
      "category": "Early Check-In upto 2 hours",
      "name": "Complimentary Early Check-In"
    ,
    {
      "category": "Late Check-Out upto 2 hours",
      "name": "Complimentary Late Check-Out"
    },
    {
      "category": "Breakfast included",
      "name": "Breakfast included."
    }
  ]
}`,
    expectedToPass: true
  },
  {
    id: 'TC_032',
    name: 'Multiple missing } before , in deeply nested array',
    description: 'Multiple objects in deeply nested array missing closing } before comma',
    input: `{
  "hotels": [
    {
      "rooms": [
        {
          "ratePlans": [
            {
              "inclusions": [
                {
                  "category": "Item 1"
                ,
                {
                  "category": "Item 2"
                ,
                {
                  "category": "Item 3"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`,
    expectedToPass: true
  },
  {
    id: 'TC_033',
    name: 'BOM (Byte Order Mark) from Windows',
    description: 'JSON with UTF-8 BOM at the beginning - common in Windows-saved files',
    input: '\uFEFF{"name": "John", "age": 30, "city": "New York"}',
    expectedToPass: true
  },
  {
    id: 'TC_034',
    name: 'Plus Signs in Numbers',
    description: 'Positive numbers with explicit plus sign - common in some API responses',
    input: '{temperature: +23.5, value: +100, score: +99, negative: -50}',
    expectedToPass: true
  },
  {
    id: 'TC_035',
    name: 'Leading Zeros in Numbers',
    description: 'Numbers with leading zeros - legacy database IDs, zero-padded codes',
    input: '{id: 007, code: 0123, year: 02025, zero: 0}',
    expectedToPass: true
  },
  {
    id: 'TC_036',
    name: 'Trailing Decimal Points',
    description: 'Numbers with trailing decimal points but no fractional part',
    input: '{value: 123., price: 45., quantity: 99., decimal: 12.5}',
    expectedToPass: true
  },
  {
    id: 'TC_037',
    name: 'Control Characters in Escaped JSON (\\r\\n)',
    description: 'Escaped JSON string containing \\r\\n control characters - real-world API logs with addresses',
    input: '{"requestBody": "{\\\"address\\\":{\\\"displayText\\\":[\\\"Line 1, Area,\\r\\nCity, State, 110055\\r\\n\\\",\\\"Locality\\\"]},\\\"checkIn\\\":\\\"12 PM\\\",\\\"checkOut\\\":\\\"11 AM\\\"}"}',
    expectedToPass: true
  },
  {
    id: 'TC_038',
    name: 'Combined Number Format Issues',
    description: 'Plus signs, leading zeros, and trailing decimals in same JSON',
    input: '{priority: +5, orderId: 007, version: 1.0, discount: 10., price: +99.99}',
    expectedToPass: true
  },
  {
    id: 'TC_039',
    name: 'Large API Response with All Patterns',
    description: 'Real-world API response with nested escaped JSON containing control chars, plus signs, leading zeros, commas in strings, and timestamps',
    input: `{
  "extraInfo": "Downstream Info",
  "req": {
    "priority": +5,
    "orderId": 007,
    "version": 1.0,
    "httpRequestTimeOut": {
      "connectionTimeout": 0,
      "readTimeout": +180000,
      "writeTimeout": 0
    }
  },
  "requestBody": "{\\\"price\\\":123.5,\\\"score\\\":+100,\\\"itemId\\\":007,\\\"hotel\\\":{\\\"checkIn\\\":\\\"12 PM\\\",\\\"checkOut\\\":\\\"11 AM\\\",\\\"address\\\":{\\\"displayText\\\":[\\\"897-898, GALI CHANDI WALI MANTOLA,\\r\\nNew Delhi, 110055\\r\\n\\\"]}},\\\"gstDetails\\\":{\\\"billingAddress\\\":\\\"1201, 1203, 12TH FLOOR\\\"}}",
  "response": {
    "status": "failed",
    "code": 007,
    "retryAfter": 30.
  }
}`,
    expectedToPass: true
  },
  {
    id: 'TC_040',
    name: 'Numeric Keys Only',
    description: 'Object with only numeric keys - database row IDs, array-like objects',
    input: '{1: "first", 2: "second", 10: "tenth", 100: "hundredth"}',
    expectedToPass: true
  },
  {
    id: 'TC_041',
    name: 'Mixed Quotes in Same Object',
    description: 'Single and double quotes mixed in same object - copy-paste from different sources',
    input: `{name: 'John', "age": 30, city: "New York", 'country': 'USA'}`,
    expectedToPass: true
  },
  {
    id: 'TC_042',
    name: 'Scientific Notation',
    description: 'Numbers in scientific notation - large/small values in scientific APIs',
    input: '{distance: 1.5e10, mass: 2.5E-3, tiny: 1e-100, planck: 6.62607015e-34}',
    expectedToPass: true
  },
  {
    id: 'TC_043',
    name: 'Multiple Colons in Value',
    description: 'Time values and URLs with multiple colons - should not confuse parser',
    input: '{"time":"12:30:45","url":"http://example.com:8080/path","timestamp":"2025-12-03T18:14:42.030+0530"}',
    expectedToPass: true
  },
  {
    id: 'TC_044',
    name: 'Commas in String Values',
    description: 'Addresses and lists containing commas - must not be interpreted as separators',
    input: '{"address":"1201, 1203, 12TH FLOOR","items":"apple, orange, banana","date":"Dec 3, 2025"}',
    expectedToPass: true
  },
  {
    id: 'TC_045',
    name: 'Stringified JSON in res field (API Response)',
    description: 'API response with stringified JSON object in res field - common in backend logs',
    input: `{
  "res": "{\\"statusCode\\":200,\\"status\\":\\"SUCCESS\\",\\"selfBookForm\\":{\\"fields\\":{\\"baseFare\\":{\\"required\\":true,\\"editable\\":true,\\"label\\":\\"Base Fare\\",\\"placeholder\\":\\"Base Fare\\",\\"fieldValidations\\":{\\"pattern\\":{\\"message\\":\\"Please enter the valid value\\",\\"value\\":\\"^\\\\d*(\\\\.\\\\d+)?$\\"}},\\"type\\":\\"INPUT\\"},\\"gstAmount\\":{\\"required\\":true,\\"editable\\":true,\\"label\\":\\"GST Amount\\",\\"type\\":\\"INPUT\\"},\\"hotelCode\\":{\\"required\\":false,\\"editable\\":true,\\"type\\":\\"HIDDEN\\"},\\"agentRefNo\\":{\\"required\\":true,\\"editable\\":true,\\"label\\":\\"Agent Reference Number\\",\\"type\\":\\"INPUT\\"}},\\"note\\":[\\"I will submit original GST invoice\\",\\"Expenses above eligibility limit\\"]}}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_046',
    name: 'URL with URL-encoded JSON characters',
    description: 'JSON with URL containing URL-encoded characters that look like JSON (%22, %7B, etc.)',
    input: `{
  "extraInfo": "Downstream Info",
  "req": "{\\"requestType\\":\\"GET\\",\\"request\\":null,\\"url\\":\\"https://staging8.quest2travel.org/RV1/Accommodation/selfbookdetails?requisitionId=614042&referenceNumber=1174101&language=eng&region=in%22,%22async%22:false,%22retryCount%22:0,%22httpRequestTimeOut%22:%7B%22connectionTimeout%22:0,%22readTimeout%22:3000%7D}",
  "level": "INFO"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_047',
    name: 'Complex Stringified JSON with nested objects and arrays',
    description: 'Full stringified JSON with multiple nested objects, arrays, and various value types',
    input: `{
  "res": "{\\"statusCode\\":200,\\"status\\":\\"SUCCESS\\",\\"selfBookForm\\":{\\"fields\\":{\\"baseFare\\":{\\"required\\":true,\\"editable\\":true,\\"label\\":\\"Base Fare\\",\\"placeholder\\":\\"Base Fare\\",\\"fieldValidations\\":{\\"pattern\\":{\\"message\\":\\"Please enter the valid value\\",\\"value\\":\\"^\\\\d*(\\\\.\\\\d+)?$\\"}},\\"type\\":\\"INPUT\\"},\\"reasonForBooking\\":{\\"required\\":true,\\"editable\\":true,\\"label\\":\\"Reason For Booking\\",\\"placeholder\\":\\"Select Reason for Booking\\",\\"type\\":\\"SEARCH_SELECT_DD\\",\\"values\\":[{\\"code\\":\\"Out of Policy\\",\\"value\\":\\"Out of Policy\\",\\"default\\":false},{\\"code\\":\\"Others\\",\\"value\\":\\"Others\\",\\"default\\":false}]},\\"bookedByQ2T\\":{\\"required\\":true,\\"editable\\":true,\\"label\\":\\"Booked By Q2T\\",\\"placeholder\\":\\"Select Yes or No\\",\\"type\\":\\"SELECT\\",\\"values\\":[{\\"code\\":\\"Yes\\",\\"value\\":\\"Yes\\",\\"default\\":true},{\\"code\\":\\"No\\",\\"value\\":\\"No\\",\\"default\\":false}]}},\\"note\\":[\\"I will submit original GST invoice for self-booked hotel\\",\\"Expenses above eligibility limit, will need to have HOD approval\\"]}}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_048',
    name: 'Invalid escape sequence \\%XX in URL (backslash before percent)',
    description: 'JSON with \\%22 pattern (backslash before URL-encoded char) - common logging issue',
    input: `{
  "extraInfo": "Downstream Info",
  "req":"{\\"requestType\\":\\"GET\\",\\"url\\":\\"https://example.com?region=in\\%22,\\%22async\\%22:false,\\%22retryCount\\%22:0\\%7D}",
  "level": "INFO",
  "headers": "\\"{\\"x-header\\":\\"value\\"}\\""
}`,
    expectedToPass: true
  },
  {
    id: 'TC_049',
    name: 'Double-quoted headers field with nested JSON',
    description: 'Headers field wrapped in extra quotes: "\\"{\\"key\\":\\"value\\"}\\"" pattern',
    input: `{
  "extraInfo": "Test",
  "level": "INFO",
  "headers": "\\"{\\"x-gommt-session-id\\":\\"7aee32a4e147907c33fbe20d1581ec0e93065b75\\",\\"x-gommt-pfm\\":\\"DESKTOP\\"}\\""
}`,
    expectedToPass: true
  },
  {
    id: 'TC_050',
    name: 'Stringified JSON with regex validation patterns',
    description: 'Stringified JSON containing \\d, \\w regex patterns that need escaping',
    input: `{"res":"{\\"statusCode\\":200,\\"form\\":{\\"fields\\":{\\"amount\\":{\\"pattern\\":\\"^\\\\d*(\\\\.\\\\d+)?$\\"},\\"gstin\\":{\\"pattern\\":\\"^([0-9]){2}([a-zA-Z]){5}([0-9]){4}$\\"}}}}"}`,
    expectedToPass: true
  },
  {
    id: 'TC_051',
    name: 'Concatenated JSON objects without separator',
    description: 'Multiple JSON objects concatenated with }{ pattern (no newlines)',
    input: `{"level":"INFO","message":"Request started"}{"level":"ERROR","message":"Request failed"}{"level":"INFO","message":"Request complete"}`,
    expectedToPass: true
  },
  {
    id: 'TC_052',
    name: 'Concatenated JSON objects with whitespace',
    description: 'Multiple JSON objects concatenated with }  { pattern (spaces between)',
    input: `{"id":1,"name":"Apple"}  {"id":2,"name":"Banana"}  {"id":3,"name":"Orange"}`,
    expectedToPass: true
  },
  {
    id: 'TC_053',
    name: 'Malformed concatenated JSON with missing closing braces',
    description: 'First object is truncated (missing closing braces) before }{ pattern',
    input: `{"level":"INFO","request":{"url":"http://example.com","params":{"id":"123","caller":"test"}{"level":"ERROR","message":"Failed"}{"level":"INFO","message":"Done"}`,
    expectedToPass: true
  },
  {
    id: 'TC_054',
    name: 'Large concatenated log entries with nested response objects',
    description: 'Multiple log entries with complex response field containing already-parsed JSON objects',
    input: `{"extra_info":"Starting query","level":"INFO","serv_nm":"PROC_QUERY","request":"{\\"query\\":\\"test\\"}"}{"extra_info":"Retrieved session","level":"INFO","serv_nm":"SESS_MGR","response":""}{"extra_info":"Parsed response","level":"INFO","response":{"schema_version":"1.0","status":"OK","data":{"id":1}}}{"extra_info":"Query done","level":"INFO"}`,
    expectedToPass: true
  },
  {
    id: 'TC_055',
    name: 'Python dict syntax in response field',
    description: 'Response field contains Python dict with single quotes and True/False/None',
    input: `{"level":"INFO","response":"{'content': [{'type': 'text', 'text': 'Hello'}], 'isError': False}"}`,
    expectedToPass: true
  },
  {
    id: 'TC_056',
    name: 'Python dict with nested objects',
    description: 'Python dict syntax with nested True/False/None values',
    input: `{"data":"{'enabled': True, 'disabled': False, 'value': None, 'items': [{'id': 1, 'active': True}]}"}`,
    expectedToPass: true
  },
  {
    id: 'TC_057',
    name: 'Python dict with embedded double quotes in values',
    description: 'Python dict where single-quoted values contain double quotes that need escaping',
    input: `{"response":"{'text': 'Hello \\"world\\"', 'tool': 'cancellation_penalty'}"}`,
    expectedToPass: true
  },
  {
    id: 'TC_058',
    name: 'String value with colon patterns that should not be quoted',
    description: 'String values containing word: pattern should not have the word quoted as a key',
    input: `{"extra_info":"Calling converter for tool: cancellation_penalty, data keys: ['schema_version', 'cr_id']","level":"INFO"}`,
    expectedToPass: true
  },
  {
    id: 'TC_059',
    name: 'MEGA TEST - All patterns combined',
    description: 'Comprehensive test with unquoted keys, single quotes, Python bools, JS literals, concatenated objects, double-escaped JSON, URL encoding, arrays with issues, and more',
    input: `{
  unquoted_key: "value1",
  'single_quoted_key': 'single quoted value',
  "normal_key": "value with colon: inside and more: colons",
  "python_bools": True,
  "python_none": None,
  "python_false": False,
  "js_undefined": undefined,
  "js_nan": NaN,
  "js_infinity": Infinity,
  "number_with_space": 1 234 567,
  "trailing_decimal": 42.,
  "leading_zero": 007,
  "plus_number": +123,
  "scientific": 1.5e10,
  missing_comma_before: "this"
  "missing_comma_after": "that",
  "nested_stringified": "{\\"inner_key\\": \\"inner_value\\", \\"nested\\": {\\"deep\\": true}}",
  "double_escaped": "{\\\\"key\\\\": \\\\"value\\\\"}",
  "python_dict_string": "{'content': [{'type': 'text', 'text': 'Hello \\"world\\"'}], 'isError': False}",
  "url_encoded": "{\\%22key\\%22: \\%22value\\%22}",
  "control_chars": "line1\\r\\nline2\\ttabbed",
  "regex_pattern": "^\\\\d+(\\\\.\\\\d+)?$",
  "array_with_issues": [
    "item1"
    "item2",
    "item3",,
    unquoted_item,
    True,
    None
  ],
  "data_keys_pattern": "Calling API for tool: my_tool, data keys: ['key1', 'key2', 'key3']",
  "response": "{'status': 'ok', 'data': {'id': 123, 'active': True, 'value': None}}",
  trailing_comma_here: "value",
}{"concatenated_object": "this is second object", "level": "INFO", "extra": "data keys: ['a', 'b']"}{"third_obj": True, python_key: 'python value', nested: "{'inner': True}"}`,
    expectedToPass: true
  },
  {
    id: 'TC_060',
    name: 'Truncated URL with ellipsis and raw newlines in strings',
    description: 'JSON with truncated URL ending in ellipsis (…,) and raw newlines in string values',
    input: `{
  "hotel": {
    "detailDeeplinkUrl": "https://www.makemytrip.com/hotels/hotel-details?hotelId=200801020952181105&checkin=12042025&…,
    "sponsored": false
  },
  "policies": [
    {
      "id": "OtherRules",
      "policyList": ["Hotel may charge compulsory gala dinner supplement on Christmas

Valid ID proof is Mandatory at the time of Check In

Outside Food not allowed"]}]}`,
    expectedToPass: true
  },
  {
    id: 'TC_061',
    name: 'Stringified JSON with leading quote (test1.json pattern)',
    description: 'JSON string value that starts with literal quote followed by escaped JSON - should unwrap and format',
    input: `{
    "res": "\\"{\\n  \\"status\\": \\"SUCCESS\\",\\n  \\"statusCode\\": 200,\\n  \\"warnings\\": [{\\n    \\"warningCode\\": \\"EXT_400091\\",\\n    \\"warningMessage\\": \\"EXT_INVALID_FREQUENT_FLYER_NUMBER\\"\\n  }]}\\""
}`,
    expectedToPass: true
  },
  {
    id: 'TC_062',
    name: 'Stringified JSON starting with brace (test2.json pattern)',
    description: 'JSON string value that starts with { and contains escaped newlines and quotes - should unwrap and format',
    input: `{
    "text": "{\\n  \\"schemaVersion\\": \\"1.0\\",\\n  \\"crId\\": \\"30a63e2c-21e0-4d23-b212-e6387e5919c7\\",\\n  \\"status\\": \\"success\\"}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_063',
    name: 'Python dict with nested stringified JSON (test3.json pattern)',
    description: 'Python dict syntax (single quotes, False) containing nested stringified JSON in text field - should convert Python syntax and unwrap nested JSON',
    input: `{
    "response": "{'content': [{'type': 'text', 'text': '{\\n  \\"schemaVersion\\": \\"1.0\\",\\n  \\"crId\\": \\"30a63e2c-21e0-4d23-b212-e6387e5919c7\\"}'}], 'isError': False}"
}`,
    expectedToPass: true
  },
  {
    id: 'TC_064',
    name: 'Log entries with unquoted keys and string containing /* */ (test4.json pattern)',
    description: 'JSON with unquoted timestamp keys and string values containing /* */ that look like comments but are actually part of the string - should quote keys and preserve string content',
    input: `{
    2025-12-08T08: 50: 01.328083971Z ip-10-117-130-63.ap-south-1.compute.internal {
      "msg": "#REQ_END_SUCCESS Completed request",
      "level": 2,
      "req": {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "cookie": "ENC_ALGO_V1~~~~~cYyCBfyZssBDhcgm31o8eYbELSOSXUjvRwcK301rQo/jKjT0pxrdoKrowW6mDc3XrpHzujQVDJDiCWFdsohRjdzV9/owMUT3fZeC+8SeSzibs0goBmZZNBi8BDbFrexrL+1nOfK7IxZ+JuYJ6XJiUyQxo14o7c1odpWXPDqs8bT80KmwlYCzmk5Zj+U1My10Pd82LEK7BxWcJUxENEiBJHEH9Sk3fa6yQuPc/qch8TGIGTzLPglnOD66UM5EDmCBufzRNDJKWqBR2F62NsLWl6yC72MWaXVYqrMhs+LafpRKkw65OFFYbBYpE3LlRm04YWaWBn8fP2ivRyzlr8G6ebBNG0zFDLaKn7sj+IZPUPPwgtNXY5a5J8vgxICaaJWQq3Wum3ZhTYNnWbXOmzWE7TTpjR89irdQo0ndV3p20fw+iu2WujxICrrB5HGihmwEi3sQVH+uRCMQUHrxN1MwhuuegE87gnd3LDW2ZL1Csn5vCc/is7lRP9CRDfXho6ZWhpph6uGmxg2dzYO5jeXxoUmdX0YsLqX6eJFQRf53F4m3A6n/+xgSacaMoQuyluXnXpAI13yHo7SKz/VyF8v5du8mf/OsuwCvmNx0dRgx0LyMW+7jifiiD91Qlr6/deo3Wfbud7u57xJV25qBq4vy3Ef2kIxv4v+gubYdEskSB+VOGftA5rS74LNG1qjUsQT191av3t00CzZ6LLDMJrIry8z+GsyCP8YcGaibDmjq4ZQzkAHM5sVf2kcKITGLxUdF9Hcz6POYMqQv2TiDpUxoEop+CZZj4ZFXqsvjddCfZEsqTzqOw9o9ZSrwFVoz1JdPee+fD3bDLSpPCzGEZxU7jFpbkBuOvXVfTvyW0EH56h4rBnlsVBd7CPPjJe5nOCW6snwSaPUgaZLjy+geHcRVk/uxc3ekfSCwYjf3jIMXH0N86AF/8xzx2CM3RJiP2k4vD9OYmb2nmpKS41lIJf7egELfAn9J9iI6ZrPNW5XwSw2hbt41xMlhQVV/MbAd9bSl0/U20HHOVd3bhVPVgyX0wbFl//zHxVgf2DLIleLclU92wMiNqi7zqUjgzpaYyAUPLowZQU4ngnrp4a4trzmFVc9FsfU7XwhspOaQQyNO4rito8KidNdCzYDJ006pxuxh"
        }
      }
    }
  2025-12-08T08: 50: 01.347124960Z ip-10-117-130-63.ap-south-1.compute.internal {
      "msg": "#EXT_API_END_SUCCESS Completed External API request",
      "level": 2,
      "req": {
        "headers": {
          "accept": "application/json, text/plain, */*"
        }
      }
    }
}`,
    expectedToPass: true
  },
  {
    id: 'TC_065',
    name: 'Stringified JSON with unescaped quotes in nested string values (test4.json res field pattern)',
    description: 'JSON with a res field containing stringified JSON, where nested string values have unescaped quotes (like appReviewExperiment) - should fix unescaped quotes and unwrap',
    input: `{
    "res": "{\\"status\\":\\"SUCCESS\\",\\"statusCode\\":0,\\"appReviewExperiment\\":\\"{\\"showAfterDays\\":30,\\"supportedLobs\\":[\\"FLIGHT\\",\\"HOTEL\\",\\"FLT\\",\\"HTL\\"]}\\"}"
}`,
    expectedToPass: true
  }
];

/**
 * Run all test cases
 */
function runTests() {
  console.log('================================================================================');
  console.log('JSON Formatter Test Suite');
  console.log('================================================================================');
  console.log(`Total test cases: ${testCases.length}\n\n`);

  let passedCount = 0;
  const failedTests = [];

  for (let idx = 0; idx < testCases.length; idx++) {
    const testCase = testCases[idx];
    console.log(`[${idx + 1}/${testCases.length}] ${testCase.id}: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    console.log('--------------------------------------------------------------------------------');

    try {
      const fixer = new JSONFixer();
      const result = fixer.fix(testCase.input);

      // Try to parse the output to verify it's valid JSON
      try {
        const parsed = JSON.parse(result.output);
        
        if (testCase.expectedToPass) {
          console.log('✅ PASS - JSON is valid and properly formatted');
          console.log(`   Fixes applied: ${result.fixes.join(', ')}`);
          passedCount++;
        } else {
          console.log('❌ FAIL - Expected to fail but passed');
          failedTests.push({
            id: testCase.id,
            error: 'Expected to fail but passed'
          });
        }
      } catch (parseError) {
        if (!testCase.expectedToPass) {
          console.log('✅ PASS - Failed as expected');
          passedCount++;
        } else {
          console.log('❌ FAIL - Output is not valid JSON');
          console.log(`   Error: ${parseError.message}`);
          failedTests.push({
            id: testCase.id,
            error: `Output not valid JSON: ${parseError.message}`
          });
        }
      }
    } catch (error) {
      if (!testCase.expectedToPass) {
        console.log('✅ PASS - Failed as expected');
        passedCount++;
      } else {
        console.log('❌ FAIL - Formatter threw an error');
        console.log(`   Error: ${error.message}`);
        failedTests.push({
          id: testCase.id,
          error: error.message
        });
      }
    }

    console.log('\n');
  }

  console.log('================================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================================');
  console.log(`Total: ${testCases.length}`);
  console.log(`Passed: ${passedCount} ✅`);
  console.log(`Failed: ${failedTests.length} ${failedTests.length > 0 ? '❌' : ''}`);
  console.log('================================================================================\n');

  if (failedTests.length > 0) {
    console.log('Failed Tests:');
    failedTests.forEach(test => console.log(`  - ${test.id}: ${test.error}`));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testCases, runTests };
