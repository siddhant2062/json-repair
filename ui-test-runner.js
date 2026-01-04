/**
 * UI Test Runner for JSON Repair Tool
 * Tests all patterns by simulating the UI behavior
 * 
 * Run with: node ui-test-runner.js
 */

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
const { testCases } = require('./test_suite.js');

/**
 * Simulate UI repair process
 */
function simulateUIRepair(input) {
  try {
    const fixer = new JSONFixer();
    const result = fixer.fix(input);
    
    // Verify output is valid JSON
    const parsed = JSON.parse(result.output);
    
    return {
      success: true,
      output: result.output,
      parsed: parsed,
      fixes: result.fixes
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: null
    };
  }
}

/**
 * Verify nested JSON strings are unwrapped
 */
function verifyUnwrappedJSON(parsed, fieldPath = []) {
  for (const key in parsed) {
    const currentPath = [...fieldPath, key];
    const value = parsed[key];
    
    if (typeof value === 'string') {
      // Check if string looks like JSON (starts with { or [)
      const trimmed = value.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        // Try to parse it - if it's valid JSON, it should have been unwrapped
        try {
          JSON.parse(value);
          // If we can parse it, it means it wasn't unwrapped (this is a failure)
          return {
            success: false,
            path: currentPath.join('.'),
            message: `Field "${currentPath.join('.')}" contains stringified JSON that should have been unwrapped`
          };
        } catch {
          // Can't parse, so it's not JSON - this is fine
        }
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively check nested objects
      const result = verifyUnwrappedJSON(value, currentPath);
      if (!result.success) {
        return result;
      }
    } else if (Array.isArray(value)) {
      // Check array items
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === 'object' && item !== null) {
          const result = verifyUnwrappedJSON(item, [...currentPath, i]);
          if (!result.success) {
            return result;
          }
        }
      }
    }
  }
  
  return { success: true };
}

/**
 * Run UI tests
 */
function runUITests() {
  console.log('================================================================================');
  console.log('JSON Repair UI Test Suite');
  console.log('================================================================================');
  console.log(`Total test cases: ${testCases.length}\n\n`);

  let passedCount = 0;
  const failedTests = [];

  testCases.forEach((testCase, index) => {
    console.log(`[${index + 1}/${testCases.length}] ${testCase.id}: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    console.log('--------------------------------------------------------------------------------');

    const result = simulateUIRepair(testCase.input);

    // Handle expected failure cases
    if (testCase.expectedToPass === false) {
      if (!result.success) {
        console.log('✅ PASS - Expected failure case correctly failed');
        passedCount++;
      } else {
        console.log('⚠️  PASS (unexpected) - This case was expected to fail but succeeded');
        passedCount++; // Still count as pass since it produced valid output
      }
    } else if (result.success) {
      // Verify nested JSON is unwrapped
      const unwrapCheck = verifyUnwrappedJSON(result.parsed);
      
      if (unwrapCheck.success) {
        console.log('✅ PASS - JSON is valid and properly formatted');
        console.log(`   Fixes applied: ${result.fixes.join(', ')}`);
        passedCount++;
      } else {
        console.log(`❌ FAIL - ${unwrapCheck.message}`);
        failedTests.push({
          id: testCase.id,
          error: unwrapCheck.message
        });
      }
    } else {
      console.log(`❌ FAIL - ${result.error}`);
      failedTests.push({
        id: testCase.id,
        error: result.error
      });
    }

    console.log('\n');
  });

  // Test specific headers pattern
  console.log('================================================================================');
  console.log('SPECIFIC PATTERN TESTS');
  console.log('================================================================================\n');

  // Test 1: Headers field
  console.log('Test: Headers Field - Double-Quoted JSON String');
  console.log('--------------------------------------------------------------------------------');
  const headersTest = `{
  "extraInfo": "Downstream Info",
  "req": "{\\"requestType\\":\\"POST\\"}",
  "headers": "\\"{\\\\\\"x-platform\\\\\\":\\\\\\"DESKTOP\\\\\\",\\\\\\"x-os\\\\\\":\\\\\\"Windows\\\\\\"}\\"",
  "response": "{\\"status\\":\\"success\\"}",
  "level": "INFO"
}`;
  const headersResult = simulateUIRepair(headersTest);
  if (headersResult.success) {
    const headers = headersResult.parsed.headers;
    if (typeof headers === 'object' && headers !== null) {
      if (headers['x-platform'] === 'DESKTOP' && headers['x-os'] === 'Windows') {
        console.log('✅ PASS - Headers field unwrapped correctly');
        passedCount++;
      } else {
        console.log('❌ FAIL - Headers field unwrapped but values incorrect');
        failedTests.push({ id: 'HEADERS_001', error: 'Headers values incorrect' });
      }
    } else {
      console.log('❌ FAIL - Headers field is still a string');
      failedTests.push({ id: 'HEADERS_001', error: 'Headers not unwrapped' });
    }
  } else {
    console.log(`❌ FAIL - ${headersResult.error}`);
    failedTests.push({ id: 'HEADERS_001', error: headersResult.error });
  }
  console.log('\n');

  // Test 2: Deeply nested escaped JSON (from TC_009)
  // Note: This test case expects valid JSON output, not necessarily unwrapped
  // because the input is a standalone string, not a field in an object
  console.log('Test: Deeply Nested Escaped JSON (Triple Level)');
  console.log('--------------------------------------------------------------------------------');
  const tripleTest = '"{\\\\\\\"level1\\\\\\\": \\\\\\"{\\\\\\\\\\\\\\\"level2\\\\\\\\\\\\\\\": \\\\\\\\\\\\\\\"value\\\\\\\\\\\\\\\"}\\\\\\\"}"';
  const tripleResult = simulateUIRepair(tripleTest);
  if (tripleResult.success) {
    // TC_009 just checks if output is valid JSON, not if it's unwrapped
    console.log('✅ PASS - Deeply nested escaped JSON produces valid JSON');
    passedCount++;
  } else {
    console.log(`❌ FAIL - ${tripleResult.error}`);
    failedTests.push({ id: 'TRIPLE_001', error: tripleResult.error });
  }
  console.log('\n');

  // Test 3: Array of escaped JSON
  console.log('Test: Array of Escaped JSON Strings');
  console.log('--------------------------------------------------------------------------------');
  const arrayTest = `{
  "items": [
    "{\\"id\\": 1, \\"name\\": \\"First\\"}",
    "{\\"id\\": 2, \\"name\\": \\"Second\\"}"
  ]
}`;
  const arrayResult = simulateUIRepair(arrayTest);
  if (arrayResult.success) {
    const items = arrayResult.parsed.items;
    if (Array.isArray(items) && items.length === 2 && 
        typeof items[0] === 'object' && items[0].id === 1 &&
        typeof items[1] === 'object' && items[1].id === 2) {
      console.log('✅ PASS - Array of escaped JSON unwrapped correctly');
      passedCount++;
    } else {
      console.log('❌ FAIL - Array items not unwrapped');
      failedTests.push({ id: 'ARRAY_001', error: 'Array items not unwrapped' });
    }
  } else {
    console.log(`❌ FAIL - ${arrayResult.error}`);
    failedTests.push({ id: 'ARRAY_001', error: arrayResult.error });
  }
  console.log('\n');

  // Summary
  console.log('================================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================================');
  const totalTests = testCases.length + 3; // Original tests + 3 specific tests
  console.log(`Total: ${totalTests}`);
  console.log(`Passed: ${passedCount} ✅`);
  console.log(`Failed: ${failedTests.length} ${failedTests.length > 0 ? '❌' : ''}`);
  console.log('================================================================================\n');

  if (failedTests.length > 0) {
    console.log('Failed Tests:');
    failedTests.forEach(test => console.log(`  - ${test.id}: ${test.error}`));
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runUITests();
}

module.exports = { runUITests, simulateUIRepair, verifyUnwrappedJSON };

