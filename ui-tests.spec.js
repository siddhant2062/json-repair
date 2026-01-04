/**
 * UI Test Suite for JSON Repair Tool
 * Tests all patterns in the Monaco editor to verify they work correctly in the UI
 * 
 * Run with: npx playwright test ui-tests.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3003';

// Import test cases from test suite
const { testCases } = require('./test_suite.js');

/**
 * Helper function to set Monaco editor content
 */
async function setEditorContent(page, content) {
  // Monaco editor uses a textarea with role="textbox"
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  
  // Clear existing content and type new content
  await editor.click();
  await editor.fill(''); // Clear
  await page.keyboard.press('Meta+a'); // Select all (Cmd+A on Mac, Ctrl+A on Windows/Linux)
  await editor.type(content, { delay: 0 }); // Type without delay for speed
}

/**
 * Helper function to click Repair JSON button and wait for result
 */
async function repairJSON(page) {
  const repairButton = page.getByRole('button', { name: 'Repair JSON' });
  await repairButton.click();
  
  // Wait for toast notification (success or error)
  await page.waitForSelector('[role="alert"]', { timeout: 10000 });
  
  // Wait a bit for the editor to update
  await page.waitForTimeout(500);
}

/**
 * Helper function to get editor content
 */
async function getEditorContent(page) {
  const editor = page.getByRole('textbox', { name: 'Editor content' });
  return await editor.inputValue();
}

/**
 * Helper function to verify JSON is valid
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to verify nested JSON strings are unwrapped
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
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const result = verifyUnwrappedJSON(item, [...currentPath, index]);
          if (!result.success) {
            return result;
          }
        }
      });
    }
  }
  
  return { success: true };
}

test.describe('JSON Repair UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/editor`);
    // Wait for Monaco editor to load
    await page.waitForSelector('[role="textbox"][aria-label="Editor content"]', { timeout: 10000 });
    await page.waitForTimeout(1000); // Give Monaco time to initialize
  });

  // Test all patterns from test suite
  testCases.forEach((testCase, index) => {
    test(`TC_${String(index + 1).padStart(3, '0')}: ${testCase.name}`, async ({ page }) => {
      // Set the test input in editor
      await setEditorContent(page, testCase.input);
      
      // Click Repair JSON
      await repairJSON(page);
      
      // Get the result
      const output = await getEditorContent(page);
      
      // Verify output is valid JSON
      expect(isValidJSON(output), `Output should be valid JSON for test case ${testCase.id}`).toBe(true);
      
      // Parse and verify structure
      const parsed = JSON.parse(output);
      expect(parsed).toBeDefined();
      
      // Verify nested JSON strings are unwrapped (if applicable)
      if (testCase.input.includes('"\\"') || testCase.input.includes('"{')) {
        const unwrapCheck = verifyUnwrappedJSON(parsed);
        expect(unwrapCheck.success, unwrapCheck.message || 'Nested JSON should be unwrapped').toBe(true);
      }
    });
  });

  // Specific test for headers field pattern
  test('Headers Field - Double-Quoted JSON String', async ({ page }) => {
    const testInput = `{
  "extraInfo": "Downstream Info",
  "req": "{\\"requestType\\":\\"POST\\"}",
  "headers": "\\"{\\\\\\"x-platform\\\\\\":\\\\\\"DESKTOP\\\\\\",\\\\\\"x-os\\\\\\":\\\\\\"Windows\\\\\\"}\\"",
  "response": "{\\"status\\":\\"success\\"}",
  "level": "INFO"
}`;

    await setEditorContent(page, testInput);
    await repairJSON(page);
    
    const output = await getEditorContent(page);
    expect(isValidJSON(output)).toBe(true);
    
    const parsed = JSON.parse(output);
    
    // Verify headers is now an object, not a string
    expect(typeof parsed.headers).toBe('object');
    expect(parsed.headers).not.toBeNull();
    expect(parsed.headers['x-platform']).toBe('DESKTOP');
    expect(parsed.headers['x-os']).toBe('Windows');
    
    // Verify req is also unwrapped
    expect(typeof parsed.req).toBe('object');
    expect(parsed.req.requestType).toBe('POST');
    
    // Verify response is unwrapped
    expect(typeof parsed.response).toBe('object');
    expect(parsed.response.status).toBe('success');
  });

  // Test for triple-quoted JSON
  test('Triple-Quoted JSON String', async ({ page }) => {
    const testInput = `{
  "data": "\\"\\"{\\\\\\"key\\\\\\":\\\\\\"value\\\\\\"}\\"\\""
}`;

    await setEditorContent(page, testInput);
    await repairJSON(page);
    
    const output = await getEditorContent(page);
    expect(isValidJSON(output)).toBe(true);
    
    const parsed = JSON.parse(output);
    expect(typeof parsed.data).toBe('object');
    expect(parsed.data.key).toBe('value');
  });

  // Test for array of escaped JSON strings
  test('Array of Escaped JSON Strings', async ({ page }) => {
    const testInput = `{
  "items": [
    "{\\"id\\": 1, \\"name\\": \\"First\\"}",
    "{\\"id\\": 2, \\"name\\": \\"Second\\"}"
  ]
}`;

    await setEditorContent(page, testInput);
    await repairJSON(page);
    
    const output = await getEditorContent(page);
    expect(isValidJSON(output)).toBe(true);
    
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items.length).toBe(2);
    expect(typeof parsed.items[0]).toBe('object');
    expect(parsed.items[0].id).toBe(1);
    expect(parsed.items[0].name).toBe('First');
    expect(parsed.items[1].id).toBe(2);
    expect(parsed.items[1].name).toBe('Second');
  });

  // Test error handling
  test('Invalid JSON Shows Error', async ({ page }) => {
    const testInput = '{ invalid json }';
    
    await setEditorContent(page, testInput);
    await repairJSON(page);
    
    // Should show error toast
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 5000 });
  });

  // Test that already valid JSON doesn't break
  test('Already Valid JSON', async ({ page }) => {
    const testInput = `{
  "name": "test",
  "value": 123
}`;

    await setEditorContent(page, testInput);
    await repairJSON(page);
    
    const output = await getEditorContent(page);
    expect(isValidJSON(output)).toBe(true);
    
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe('test');
    expect(parsed.value).toBe(123);
  });
});

