/**
 * Universal JSON Fixer
 * Intelligently fixes common JSON issues while preserving data
 */

interface FixOptions {
  compact?: boolean;
  sortKeys?: boolean;
}

interface FixResult {
  success?: boolean;
  output: string;
  fixes: string[];
  parsed?: any;
}

class JSONFixer {
  private fixes: string[] = [];

  constructor() {
    this.fixes = [];
  }

  /**
   * Main method to fix and format JSON
   */
  fix(input: string, options: FixOptions = {}): FixResult {
    this.fixes = [];

    if (!input || input.trim() === "") {
      throw new Error("Input is empty");
    }

    let fixed = input.trim();

    // Step 0: First, try to parse as-is (if it's already valid JSON, don't break it!)
    try {
      let parsed = JSON.parse(fixed);

      // Recursively unwrap any stringified JSON values inside the object
      const unwrapped = this.deepUnwrapStringifiedJSON(parsed);

      // Check if unwrapping made any changes
      if (JSON.stringify(unwrapped) !== JSON.stringify(parsed)) {
        this.fixes.push("Unwrapped nested stringified JSON values");
        parsed = unwrapped;
      }

      const formatted = JSON.stringify(parsed, null, options.compact ? 0 : 2);

      return {
        success: true,
        output: formatted,
        fixes:
          this.fixes.length > 0 ? this.fixes : ["JSON is already formatted"],
        parsed: parsed,
      };
    } catch (e) {
      // JSON is invalid, proceed with fixes
    }

    // Step 0a: Fix invalid escape sequences like \%XX (backslash before percent)
    // This is a common issue when URL-encoded content is incorrectly escaped
    fixed = this.fixInvalidEscapeSequences(fixed);

    // Step 0a1: Fix improperly closed strings ending with %22, or …, followed by quote+key
    // Pattern: "key": "value%22,"nextKey" -> "key": "value","nextKey"
    // Pattern: "key": "value…,"nextKey" -> "key": "value…","nextKey"
    fixed = this.fixImproperlyClosedURLStrings(fixed);

    // Step 0a2: Fix raw control characters early (handles newlines in strings)
    // This often occurs with improperly closed URL strings
    fixed = this.fixRawControlChars(fixed);

    // Try parsing after early fixes
    try {
      let parsed = JSON.parse(fixed);
      
      // Before unwrapping, check if any string values contain JSON with unescaped quotes
      // This handles the res field pattern where the entire res string is JSON with unescaped quotes in nested values
      // We'll handle this in deepUnwrapStringifiedJSON instead
      
      const unwrapped = this.deepUnwrapStringifiedJSON(parsed);
      if (JSON.stringify(unwrapped) !== JSON.stringify(parsed)) {
        this.fixes.push("Unwrapped nested stringified JSON values");
        parsed = unwrapped;
      }
      const formatted = JSON.stringify(parsed, null, options.compact ? 0 : 2);
      return {
        success: true,
        output: formatted,
        fixes:
          this.fixes.length > 0 ? this.fixes : ["JSON is already formatted"],
        parsed: parsed,
      };
    } catch (e) {
      // Still invalid, continue with other fixes
    }

    // Step 0b: Try URL decoding only if initial parse failed
    // This handles cases where JSON strings contain %22, %7B, etc.
    try {
      const urlDecoded = this.decodeURLEncodedInStrings(fixed);
      if (urlDecoded !== fixed) {
        let parsed = JSON.parse(urlDecoded);
        const unwrapped = this.deepUnwrapStringifiedJSON(parsed);
        if (JSON.stringify(unwrapped) !== JSON.stringify(parsed)) {
          this.fixes.push("Unwrapped nested stringified JSON values");
          parsed = unwrapped;
        }
        this.fixes.push("Decoded URL-encoded characters");
        const formatted = JSON.stringify(parsed, null, options.compact ? 0 : 2);
        return {
          success: true,
          output: formatted,
          fixes: this.fixes,
          parsed: parsed,
        };
      }
    } catch (e) {
      // URL decoding didn't help, continue with other fixes
    }

    // Step 0a: Fix unescaped nested JSON in string values (CRITICAL - must be first!)
    fixed = this.fixUnescapedNestedJSON(fixed);

    // Step 0b: Check for concatenated JSON objects (NDJSON)
    fixed = this.handleConcatenatedJSON(fixed);

    // Step 0c: Check for double-escaped JSON
    fixed = this.handleDoubleEscaped(fixed);

    // Step 0c1: Fix JavaScript literals (undefined, NaN, Infinity)
    fixed = this.fixJavaScriptLiterals(fixed);

    // Step 0d: Fix Python-style literals (True/False/None, tuples, hex)
    fixed = this.fixPythonLiterals(fixed);

    // Step 0e: Fix illegal hex escapes (\xNN -> \u00NN)
    fixed = this.fixIllegalHexEscapes(fixed);

    // Step 0f: Fix numbers with spaces (European format)
    fixed = this.fixNumbersWithSpaces(fixed);

    // Step 0g: Fix number format issues (plus signs, leading zeros, trailing decimals)
    fixed = this.fixNumberFormats(fixed);

    // Step 0h: Remove BOM (Byte Order Mark) if present
    fixed = this.removeBOM(fixed);

    // Step 1: Remove comments (MUST be before preprocessing unquoted values!)
    fixed = this.removeComments(fixed);

    // Step 1b: Remove garbage characters in the middle of JSON (like "value" [ ] } ,)
    fixed = this.removeMiddleGarbage(fixed);

    // Step 1c: Trim trailing garbage after complete JSON structure
    fixed = this.trimTrailingGarbage(fixed);

    // Step 1d: Fix array-style key-value pairs (convert [key:value] to {"key":"value"})
    fixed = this.fixArrayStyleKeyValue(fixed);

    // Step 1e: Fix malformed double-escaped quotes (\\") which should be (\\\")
    fixed = this.fixMalformedDoubleEscapes(fixed);

    // Step 2: Preprocess unquoted values (must be after removing comments!)
    fixed = this.preprocessUnquotedValues(fixed);

    // Step 3: Fix quotes (single quotes to double quotes)
    fixed = this.fixQuotes(fixed);

    // Step 3a: Fix raw control characters (newlines, tabs) in strings
    fixed = this.fixRawControlChars(fixed);

    // Step 3b: Fix empty/missing values (e.g., {"a": , "b": })
    fixed = this.fixEmptyValues(fixed);

    // Step 4: Fix trailing commas
    fixed = this.removeTrailingCommas(fixed);

    // Step 5: Balance braces FIRST (before adding commas) to handle missing braces in middle
    // This ensures we close structures properly before adding commas
    fixed = this.balanceBraces(fixed);

    // Step 6: Fix missing commas (after balancing braces)
    fixed = this.addMissingCommas(fixed);

    // Step 7: Fix unescaped characters
    fixed = this.fixEscaping(fixed);

    // Step 8: Balance braces again (in case commas revealed more issues)
    fixed = this.balanceBraces(fixed);

    // Step 8: Try to parse and format
    try {
      let parsed = JSON.parse(fixed);

      // Step 8a: Recursively unwrap any stringified JSON values inside the object
      parsed = this.deepUnwrapStringifiedJSON(parsed);

      // Sort keys if requested
      const finalObject = options.sortKeys
        ? this.sortObjectKeys(parsed)
        : parsed;

      // Format with proper indentation
      const indentation = options.compact ? 0 : 2;
      const formatted = JSON.stringify(finalObject, null, indentation);

      return {
        success: true,
        output: formatted,
        fixes: this.fixes,
        parsed: finalObject,
      };
    } catch (error: any) {
      // If still can't parse, try more aggressive fixes
      // BUT: Skip aggressive fix if input is a valid JSON string (let handleDoubleEscaped handle it)
      const trimmed = fixed.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
          // Try to parse as JSON string first
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === "string") {
            // It's a valid JSON string that contains JSON
            // Try to parse the inner content
            const innerTrimmed = parsed.trim();
            if (innerTrimmed.startsWith("{") || innerTrimmed.startsWith("[")) {
              try {
                const innerParsed = JSON.parse(parsed);
                // Successfully parsed! Apply unwrapping
                const unwrapped = this.deepUnwrapStringifiedJSON(innerParsed);
                this.fixes.push("Unwrapped double-escaped JSON");
                const formatted = JSON.stringify(unwrapped, null, 2);
                return {
                  success: true,
                  output: formatted,
                  fixes: this.fixes,
                  parsed: unwrapped,
                };
              } catch (e) {
                // Continue to aggressive fix
              }
            }
          } else if (typeof parsed === "object" && parsed !== null) {
            // Parsed directly to an object - unwrap any nested strings
            const unwrapped = this.deepUnwrapStringifiedJSON(parsed);
            this.fixes.push("Unwrapped double-escaped JSON");
            const formatted = JSON.stringify(unwrapped, null, 2);
            return {
              success: true,
              output: formatted,
              fixes: this.fixes,
              parsed: unwrapped,
            };
          }
        } catch (e) {
          // Not a valid JSON string, continue to aggressive fix
        }
      }

      try {
        fixed = this.aggressiveFix(fixed);
        let parsed = JSON.parse(fixed);

        // Recursively unwrap nested stringified JSON
        parsed = this.deepUnwrapStringifiedJSON(parsed);

        const finalObject = options.sortKeys
          ? this.sortObjectKeys(parsed)
          : parsed;
        const indentation = options.compact ? 0 : 2;
        const formatted = JSON.stringify(finalObject, null, indentation);

        return {
          success: true,
          output: formatted,
          fixes: this.fixes,
          parsed: finalObject,
        };
      } catch (finalError: any) {
        // Enhanced error message with line number
        const errorMsg = this.getEnhancedError(finalError, fixed);
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * Decode URL-encoded characters in JSON string values
   * Handles cases like: "req":"{\%22requestType\%22:\%22GET\%22}" -> "req":"{\"requestType\":\"GET\"}"
   */
  private decodeURLEncodedInStrings(str: string): string {
    let result = str;
    let changed = false;
    let i = 0;
    let output = "";

    // Manually parse through the string to find and decode URL-encoded content in string values
    while (i < result.length) {
      // Look for start of a string value (opening quote)
      if (result[i] === '"' && (i === 0 || result[i - 1] !== "\\")) {
        output += '"';
        i++;
        const stringStart = i;
        let stringContent = "";
        let inString = true;

        // Collect the string content
        while (i < result.length && inString) {
          if (result[i] === "\\" && i + 1 < result.length) {
            // Escaped character
            stringContent += result[i] + result[i + 1];
            i += 2;
          } else if (result[i] === '"' && result[i - 1] !== "\\") {
            // End of string
            inString = false;
            i++;
          } else {
            stringContent += result[i];
            i++;
          }
        }

        // Check if this string contains URL-encoded characters
        if (/%[0-9A-Fa-f]{2}/.test(stringContent)) {
          try {
            // Decode URL-encoded characters
            // First, handle escaped sequences carefully
            let processed = stringContent;

            // Temporarily replace escaped sequences
            const escapeMap: { [key: string]: string } = {};
            let escapeIndex = 0;
            processed = processed.replace(/\\(.)/g, (match, char) => {
              const key = `__ESC${escapeIndex++}__`;
              escapeMap[key] = match;
              return key;
            });

            // Now decode URL-encoded characters
            let decoded = decodeURIComponent(processed);

            // Restore escaped sequences
            for (const [key, value] of Object.entries(escapeMap)) {
              decoded = decoded.replace(key, value);
            }

            // Properly escape the decoded content for JSON
            // We need to be careful: if decoded content already has escaped sequences, preserve them
            // But if it has unescaped quotes, escape them
            let escaped = decoded;

            // First, protect existing escape sequences
            const protectedEscapes: { [key: string]: string } = {};
            let protectIndex = 0;
            escaped = escaped.replace(/\\(.)/g, (match, char) => {
              const key = `__PROTECT${protectIndex++}__`;
              protectedEscapes[key] = match;
              return key;
            });

            // Now escape unescaped quotes and other special chars
            escaped = escaped
              .replace(/"/g, '\\"') // Escape unescaped quotes
              .replace(/\n/g, "\\n") // Escape newlines
              .replace(/\r/g, "\\r") // Escape carriage returns
              .replace(/\t/g, "\\t"); // Escape tabs

            // Restore protected escape sequences
            for (const [key, value] of Object.entries(protectedEscapes)) {
              escaped = escaped.replace(key, value);
            }

            // Finally, escape any remaining backslashes that aren't part of escape sequences
            escaped = escaped.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\");

            output += escaped;
            changed = true;
          } catch (e) {
            // Decode failed, keep original
            output += stringContent;
          }
        } else {
          // No URL encoding, keep original
          output += stringContent;
        }
      } else {
        // Not a string, copy as-is
        output += result[i];
        i++;
      }
    }

    if (changed) {
      this.fixes.push("Decoded URL-encoded characters in JSON strings");
      return output;
    }

    return result;
  }

  /**
   * Recursively unwrap stringified JSON values inside objects/arrays
   * Converts: {"data": "{\"id\": 1}"} -> {"data": {"id": 1}}
   */
  private deepUnwrapStringifiedJSON(obj: any, depth: number = 0): any {
    // Prevent infinite recursion - 100 levels handles any realistic JSON
    // while still protecting against stack overflow (JS limit ~10,000)
    if (depth > 100) {
      return obj;
    }

    if (typeof obj === "string") {
      const trimmed = obj.trim();

      // Quick check: If this looks like JSON with unescaped quotes in string values, fix it first
      // This handles patterns like: "key":"{"nested":"value"}" -> "key":"{\"nested\":\"value\"}"
      let quickFixed: string | undefined = undefined;
      let quickChanged = false;
      
      if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length > 2) {
        // Check if it has the :"{ pattern (string values containing JSON)
        if (trimmed.includes(':"{')) {
          quickFixed = trimmed;
          quickChanged = false; // Reset
          let quickPos = 0;
          let quickIteration = 0;
          
    while (quickIteration < 20 && quickPos < quickFixed.length) {
      // First, check for triple quotes pattern: :""" -> :""
      // This handles cases like "key":""" -> "key":""
      const tripleQuotesIndex = quickFixed.indexOf(':\"\"\"', quickPos);
      if (tripleQuotesIndex !== -1) {
        // Replace triple quotes with double quotes (empty string)
        quickFixed = quickFixed.substring(0, tripleQuotesIndex + 2) + 
                    '\"' + 
                    quickFixed.substring(tripleQuotesIndex + 5);
        quickChanged = true;
        quickPos = 0; // Restart from beginning
        quickIteration++;
        continue;
      }
      
      // Look for :"{ pattern, but skip if the next character after { is already an escaped quote (\")
      const colonQuoteIndex = quickFixed.indexOf(':"{', quickPos);
      if (colonQuoteIndex === -1) break;
      
      // Check if this pattern is already fixed (quotes are escaped)
      // After :"{, if we see \", the quotes are already escaped
      if (colonQuoteIndex + 3 < quickFixed.length && quickFixed[colonQuoteIndex + 3] === '\\') {
        // Already escaped, skip
        quickPos = colonQuoteIndex + 1;
        continue;
      }
            
            // Find matching closing brace
            let braceCount = 1;
            let bracketCount = 0;
            let jsonEnd = colonQuoteIndex + 3;
            while (jsonEnd < quickFixed.length && (braceCount > 0 || bracketCount > 0)) {
              if (quickFixed[jsonEnd] === '\\') {
                jsonEnd += 2;
                continue;
              }
              if (quickFixed[jsonEnd] === '{') braceCount++;
              else if (quickFixed[jsonEnd] === '}') braceCount--;
              else if (quickFixed[jsonEnd] === '[') bracketCount++;
              else if (quickFixed[jsonEnd] === ']') bracketCount--;
              jsonEnd++;
            }
            
            let quotePos = jsonEnd;
            while (quotePos < quickFixed.length && (quickFixed[quotePos] === ' ' || quickFixed[quotePos] === '\n' || quickFixed[quotePos] === '\t')) {
              quotePos++;
            }
            
            if (braceCount === 0 && bracketCount === 0 && quotePos < quickFixed.length && quickFixed[quotePos] === '"') {
              const jsonContent = quickFixed.substring(colonQuoteIndex + 2, jsonEnd);
              
              // When JSON content is inside a string value, ALL quotes need to be escaped
              // Even if the JSON content itself parses, it needs quotes escaped to be valid inside a JSON string
              // Escape all unescaped quotes in the JSON content
              let escapedContent = "";
              let needsEscaping = false;
              for (let j = 0; j < jsonContent.length; j++) {
                if (jsonContent[j] === "\\" && j + 1 < jsonContent.length) {
                  // Preserve escaped sequences
                  escapedContent += jsonContent[j];
                  escapedContent += jsonContent[j + 1];
                  j++;
                  continue;
                }
                if (jsonContent[j] === '"') {
                  // This quote needs to be escaped (it's inside a JSON string value)
                  escapedContent += '\\"';
                  needsEscaping = true;
                  quickChanged = true;
                } else {
                  escapedContent += jsonContent[j];
                }
              }
              
              if (needsEscaping) {
                quickFixed = quickFixed.substring(0, colonQuoteIndex + 2) + 
                            escapedContent + 
                            quickFixed.substring(jsonEnd, quotePos) +
                            quickFixed.substring(quotePos);
                quickPos = 0; // Restart from beginning
                quickIteration++;
                continue;
              } else {
                quickPos = quotePos + 1;
                continue;
              }
            }
            quickPos = colonQuoteIndex + 1;
          }
        }
        
        if (quickChanged && quickFixed !== undefined) {
          try {
            const parsed = JSON.parse(quickFixed);
            if ((typeof parsed === "object" && parsed !== null) || Array.isArray(parsed)) {
              this.fixes.push("Fixed unescaped quotes in JSON string values (quick fix)");
              return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
            }
          } catch (e) {
            // Quick fix didn't fully work, continue with normal flow
          }
        }
      }

      // Recursive unwrap: keep trying to parse until we get an object/array or can't parse anymore
      // If quick fix made changes but didn't parse, use the fixed string
      let current: any = (quickFixed !== undefined && quickChanged) ? quickFixed : trimmed;
      let parseAttempts = 0;
      const maxAttempts = 100; // Handle deeply nested stringified JSON (100 levels)

      while (parseAttempts < maxAttempts && typeof current === "string") {
        // Check for Python dict syntax FIRST (before other strategies)
        // This handles cases like: "{'key': 'value', 'isError': False}"
        const trimmedForPython = current.trim();
        const hasPythonSyntax = 
          trimmedForPython.includes("'") ||
          trimmedForPython.includes("True") ||
          trimmedForPython.includes("False") ||
          trimmedForPython.includes("None");
        
        if (hasPythonSyntax) {
          const startsWithBrace = trimmedForPython.startsWith("{") || trimmedForPython.startsWith("[");
          const wrappedInQuotes = 
            (trimmedForPython.startsWith('"') && trimmedForPython.endsWith('"')) ||
            (trimmedForPython.startsWith("'") && trimmedForPython.endsWith("'"));
          const looksLikePythonDict = 
            (trimmedForPython.startsWith('"') && trimmedForPython.includes("':") && trimmedForPython.includes("'")) ||
            (trimmedForPython.startsWith("'") && trimmedForPython.includes("':") && trimmedForPython.includes("'"));
          
          if (startsWithBrace || wrappedInQuotes || looksLikePythonDict) {
            try {
              let toConvert = trimmedForPython;
              if ((wrappedInQuotes || looksLikePythonDict) && toConvert.length > 2) {
                if ((toConvert.startsWith('"') && toConvert.endsWith('"')) ||
                    (toConvert.startsWith("'") && toConvert.endsWith("'"))) {
                  toConvert = toConvert.slice(1, -1);
                }
              }
              
              const jsonified = this.pythonDictToJSON(toConvert);
              const parsed = JSON.parse(jsonified);
              if (
                (typeof parsed === "object" && parsed !== null) ||
                Array.isArray(parsed)
              ) {
                this.fixes.push("Converted Python dict syntax to JSON");
                return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
              }
            } catch (e5) {
              // Python dict conversion failed, continue to other strategies
            }
          }
        }

        try {
          // First, try parsing as-is (in case it's already valid JSON)
          try {
            const parsed = JSON.parse(current);
            if (
              (typeof parsed === "object" && parsed !== null) ||
              Array.isArray(parsed)
            ) {
              this.fixes.push(
                `Unwrapped ${parseAttempts > 0 ? "nested " : ""}stringified JSON value`,
              );
              return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
            }
            // If we got a string, keep trying
            if (typeof parsed === "string") {
              current = parsed;
              parseAttempts++;
              continue;
            }
            // Got a primitive, stop
            break;
          } catch (e_direct) {
            // Direct parse failed, try escaping control characters
          // These can appear when \r\n in the original JSON gets converted to actual characters
          const escapedCurrent = current
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");

          const parsed = JSON.parse(escapedCurrent);

          // If we got an object/array, we're done!
          if (
            (typeof parsed === "object" && parsed !== null) ||
            Array.isArray(parsed)
          ) {
            this.fixes.push(
              `Unwrapped ${parseAttempts > 0 ? "nested " : ""}stringified JSON value`,
            );
            return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
          }

          // If we got a string, keep trying
          if (typeof parsed === "string") {
            current = parsed;
            parseAttempts++;
            continue;
          }

          // Got a primitive, stop
          break;
          }
        } catch (e) {
          // Can't parse as-is, try different strategies

          // Strategy 0: Fix invalid escape sequences in regex patterns (\d, \w, \s, etc.)
          // These are valid in regex but not in JSON strings
          if (
            (current.startsWith("{") && current.endsWith("}")) ||
            (current.startsWith("[") && current.endsWith("]"))
          ) {
            try {
              // Fix invalid JSON escape sequences by doubling the backslash
              // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
              const fixedEscapes = current.replace(
                /\\([^"\\/bfnrtu])/g,
                "\\\\$1",
              );
              const parsed = JSON.parse(fixedEscapes);
              if (
                (typeof parsed === "object" && parsed !== null) ||
                Array.isArray(parsed)
              ) {
                this.fixes.push(
                  "Unwrapped stringified JSON with regex patterns",
                );
                return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
              }
            } catch (e0) {
              // Strategy 0 failed
            }
          }

          // Strategy 1: If it looks like JSON with braces/brackets, try escaping and parsing
          // This handles strings that start with { or [ and contain literal quotes/newlines
          // Pattern: "{\n  \"key\": \"value\"}" -> needs quotes and newlines escaped
          const trimmed = current.trimStart();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              // First, try parsing as-is (in case it's already valid JSON)
              try {
                const parsed = JSON.parse(trimmed);
                if (
                  (typeof parsed === "object" && parsed !== null) ||
                  Array.isArray(parsed)
                ) {
                  this.fixes.push("Unwrapped stringified JSON starting with brace/bracket");
                  return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                }
              } catch (e1a) {
                // If that fails, the string contains literal quotes/newlines that need escaping
                // The string might contain literal backslash+n sequences (like \n as two chars)
                // We need to properly escape it for JSON parsing
                
                // Strategy 1b: Wrap in quotes and escape properly
                // First, escape all backslashes (so literal \n becomes \\n)
                let escaped = trimmed.replace(/\\/g, "\\\\");
                // Then escape all quotes
                escaped = escaped.replace(/"/g, '\\"');
                // Wrap in quotes to make it a valid JSON string
                escaped = '"' + escaped + '"';
                
                try {
                  // Parse as a JSON string first
                  const stringValue = JSON.parse(escaped);
                  if (typeof stringValue === "string") {
                    // Now try to parse the inner content as JSON
                    try {
                      const parsed = JSON.parse(stringValue);
                      if (
                        (typeof parsed === "object" && parsed !== null) ||
                        Array.isArray(parsed)
                      ) {
                        this.fixes.push("Unwrapped stringified JSON with literal quotes/newlines");
                        return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                      }
                    } catch (e1b_inner) {
                      // Inner parse failed, try converting literal \n to actual newlines
                      // The stringValue contains literal backslash+n sequences that need conversion
                      let processed = stringValue
                        .replace(/\\n/g, "\n")   // Convert literal \n to actual newline
                        .replace(/\\r/g, "\r")   // Convert literal \r to actual carriage return
                        .replace(/\\t/g, "\t")   // Convert literal \t to actual tab
                        .replace(/\\\\/g, "\\"); // Convert literal \\ to single backslash
                      
                      // Now the string has actual control characters, try parsing directly
                      try {
                        const parsed = JSON.parse(processed);
                        if (
                          (typeof parsed === "object" && parsed !== null) ||
                          Array.isArray(parsed)
                        ) {
                          this.fixes.push("Unwrapped stringified JSON with literal escape sequences");
                          return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                        }
                      } catch (e1b_inner2) {
                        // Still failed - the string might have other issues
                        // Try one more time with proper JSON escaping
                        let reEscaped = processed
                          .replace(/\\/g, "\\\\")  // Escape backslashes
                          .replace(/\r/g, "\\r")    // Escape carriage returns
                          .replace(/\n/g, "\\n")  // Escape newlines
                          .replace(/\t/g, "\\t")  // Escape tabs
                          .replace(/"/g, '\\"');   // Escape quotes
                        
                        try {
                          const parsed = JSON.parse(reEscaped);
                          if (
                            (typeof parsed === "object" && parsed !== null) ||
                            Array.isArray(parsed)
                          ) {
                            this.fixes.push("Unwrapped stringified JSON with converted escape sequences");
                            return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                          }
                        } catch (e1b_inner3) {
                          // All strategies failed
                        }
                      }
                    }
                  }
                } catch (e1b) {
                  // Wrapped parse failed, try direct unescaping approach
                  const unescaped = trimmed
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, "\\")
                .replace(/\r/g, "\\r")
                .replace(/\n/g, "\\n")
                .replace(/\t/g, "\\t");
                  
                  try {
              const parsed = JSON.parse(unescaped);
              if (
                (typeof parsed === "object" && parsed !== null) ||
                Array.isArray(parsed)
              ) {
                this.fixes.push("Unwrapped string with literal escaped quotes");
                return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                    }
                  } catch (e1c) {
                    // Strategy 1 failed
                  }
                }
              }
            } catch (e2) {
              // Strategy 1 failed
            }
          }

          // Strategy 2a: If string starts with quote followed by { or [, try removing the leading quote
          // This handles patterns like: "\"{\n  \"key\": \"value\"}\"" where the string starts with a literal quote
          // Also handles cases with whitespace/newlines after the quote: "\"\n  {\n  \"key\": ..."
          const trimmedAfterQuote = current.trimStart();
          if (
            trimmedAfterQuote.startsWith('"') &&
            (trimmedAfterQuote.length > 1 && 
             (trimmedAfterQuote[1] === "{" || 
              trimmedAfterQuote[1] === "[" ||
              // Also check if there's whitespace/newlines followed by { or [
              (trimmedAfterQuote.length > 2 && 
               /^\s*[{[]/.test(trimmedAfterQuote.slice(1)))))
          ) {
            try {
              // Remove the leading quote and any whitespace after it
              // Find the first non-whitespace character after the quote
              let withoutLeadingQuote = trimmedAfterQuote.slice(1).trimStart();
              
              // Also remove trailing quote if present (handles patterns ending with }" or ]")
              if (withoutLeadingQuote.endsWith('"')) {
                withoutLeadingQuote = withoutLeadingQuote.slice(0, -1);
              }
              
              // First try parsing as-is (in case it's already valid JSON)
              try {
                const parsed = JSON.parse(withoutLeadingQuote);
                if (
                  (typeof parsed === "object" && parsed !== null) ||
                  Array.isArray(parsed)
                ) {
                  this.fixes.push("Unwrapped stringified JSON with leading quote");
                  return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                }
              } catch (e2a1) {
                // If that fails, the string might contain actual control characters
                // that need to be escaped for JSON parsing
                // Convert actual newlines/tabs/carriage returns to escaped sequences
                const escaped = withoutLeadingQuote
                  .replace(/\r/g, "\\r")
                  .replace(/\n/g, "\\n")
                  .replace(/\t/g, "\\t");
                
                try {
                  const parsed = JSON.parse(escaped);
                  if (
                    (typeof parsed === "object" && parsed !== null) ||
                    Array.isArray(parsed)
                  ) {
                    this.fixes.push("Unwrapped stringified JSON with leading quote");
                    return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                  }
                } catch (e2a2) {
                  // If that also fails, try unescaping escaped quotes and backslashes
                  // This handles cases where the content has \\" or \\\\ patterns
                  const unescaped = escaped
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, "\\");
                  
                  try {
                    const parsed = JSON.parse(unescaped);
                    if (
                      (typeof parsed === "object" && parsed !== null) ||
                      Array.isArray(parsed)
                    ) {
                      this.fixes.push("Unwrapped stringified JSON with leading quote");
                      return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                    }
                  } catch (e2a3) {
                    // All strategies failed
                  }
                }
              }
            } catch (e2a) {
              // Strategy 2a failed
            }
          }

          // Strategy 2: If string starts with quote, try removing outer quotes manually
          if (
            current.startsWith('"') &&
            current.endsWith('"') &&
            current.length > 2
          ) {
            try {
              // Remove outer quotes and try parsing
              const withoutQuotes = current.slice(1, -1);
              // Unescape the inner content and handle control chars
              const unescaped = withoutQuotes
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, "\\")
                .replace(/\r/g, "\\r")
                .replace(/\n/g, "\\n")
                .replace(/\t/g, "\\t");
              const parsed = JSON.parse(unescaped);
              if (
                (typeof parsed === "object" && parsed !== null) ||
                Array.isArray(parsed)
              ) {
                this.fixes.push("Unwrapped quoted JSON string");
                return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
              }
            } catch (e3) {
              // Strategy 2 failed
            }
          }

          // Strategy 3: URL-decode the string if it contains %22 (URL-encoded quotes)
          // This handles cases where JSON was corrupted by URL encoding
          if (
            current.includes("%22") ||
            current.includes("%7B") ||
            current.includes("%7D")
          ) {
            try {
              let urlDecoded = decodeURIComponent(current);

              // Fix any invalid escape sequences that might result
              urlDecoded = urlDecoded.replace(/\\([^"\\/bfnrtu])/g, "\\\\$1");

              // Try parsing directly
              try {
                const parsed = JSON.parse(urlDecoded);
                if (
                  (typeof parsed === "object" && parsed !== null) ||
                  Array.isArray(parsed)
                ) {
                  this.fixes.push("Unwrapped URL-encoded JSON string");
                  return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                }
              } catch (parseErr: any) {
                // Parsing failed - try various fixes

                // Fix 1: Remove trailing braces one at a time
                let trimmed = urlDecoded;
                for (let i = 0; i < 5 && trimmed.endsWith("}"); i++) {
                  trimmed = trimmed.slice(0, -1);
                  try {
                    const parsed = JSON.parse(trimmed);
                    if (
                      (typeof parsed === "object" && parsed !== null) ||
                      Array.isArray(parsed)
                    ) {
                      this.fixes.push(
                        "Unwrapped URL-encoded JSON string (fixed duplicate braces)",
                      );
                      return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                    }
                  } catch (e) {
                    // Keep trying
                  }
                }

                // Fix 2: Extract valid JSON from the beginning (handles concatenated garbage)
                // Find the position where JSON becomes invalid and try parsing up to there
                const errorMatch = parseErr.message.match(/position (\d+)/);
                if (errorMatch) {
                  const errorPos = parseInt(errorMatch[1]);
                  // Try to find a valid JSON object by cutting at the error position
                  // and finding the last complete object
                  for (let cutPos = errorPos; cutPos > 10; cutPos--) {
                    const truncated = urlDecoded.substring(0, cutPos);
                    // Count braces to find where object ends
                    let braceCount = 0;
                    let lastValidEnd = -1;
                    for (let i = 0; i < truncated.length; i++) {
                      if (truncated[i] === "{") braceCount++;
                      else if (truncated[i] === "}") {
                        braceCount--;
                        if (braceCount === 0) {
                          lastValidEnd = i + 1;
                        }
                      }
                    }
                    if (lastValidEnd > 0) {
                      try {
                        const validPart = urlDecoded.substring(0, lastValidEnd);
                        const parsed = JSON.parse(validPart);
                        if (
                          (typeof parsed === "object" && parsed !== null) ||
                          Array.isArray(parsed)
                        ) {
                          this.fixes.push(
                            "Unwrapped URL-encoded JSON (extracted valid portion)",
                          );
                          return this.deepUnwrapStringifiedJSON(
                            parsed,
                            depth + 1,
                          );
                        }
                      } catch (e) {
                        // Keep trying
                      }
                      break;
                    }
                  }
                }

                // Fix 3: Add missing closing braces
                let extended = urlDecoded;
                for (let i = 0; i < 5; i++) {
                  extended += "}";
                  try {
                    const parsed = JSON.parse(extended);
                    if (
                      (typeof parsed === "object" && parsed !== null) ||
                      Array.isArray(parsed)
                    ) {
                      this.fixes.push(
                        "Unwrapped URL-encoded JSON string (added missing braces)",
                      );
                      return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                    }
                  } catch (e) {
                    // Keep trying
                  }
                }
              }
            } catch (e4) {
              // URL decoding failed
            }
          }

          // Strategy 4: Handle Python dict syntax (single quotes, True/False/None)
          // This handles cases where Python dict was dumped as string
          // Also handles cases where it's wrapped in quotes or has leading whitespace
          const trimmedForPython = current.trim();
          const hasPythonSyntax = 
            trimmedForPython.includes("'") ||
            trimmedForPython.includes("True") ||
            trimmedForPython.includes("False") ||
            trimmedForPython.includes("None");
          
          if (hasPythonSyntax) {
            // Check if it starts with { or [ (possibly after whitespace or quotes)
            const startsWithBrace = trimmedForPython.startsWith("{") || trimmedForPython.startsWith("[");
            // Also check if it's wrapped in quotes and contains Python dict inside
            const wrappedInQuotes = 
              (trimmedForPython.startsWith('"') && trimmedForPython.endsWith('"')) ||
              (trimmedForPython.startsWith("'") && trimmedForPython.endsWith("'"));
            
            // Also check if it looks like a Python dict even if wrapped (pattern: "{'key': 'value'}")
            const looksLikePythonDict = 
              (trimmedForPython.startsWith('"') && trimmedForPython.includes("':") && trimmedForPython.includes("'")) ||
              (trimmedForPython.startsWith("'") && trimmedForPython.includes("':") && trimmedForPython.includes("'"));
            
            if (startsWithBrace || wrappedInQuotes || looksLikePythonDict) {
              try {
                // If wrapped in quotes, remove them first
                let toConvert = trimmedForPython;
                if ((wrappedInQuotes || looksLikePythonDict) && toConvert.length > 2) {
                  // Remove outer quotes (either single or double)
                  if ((toConvert.startsWith('"') && toConvert.endsWith('"')) ||
                      (toConvert.startsWith("'") && toConvert.endsWith("'"))) {
                    toConvert = toConvert.slice(1, -1);
                  }
                }
                
                const jsonified = this.pythonDictToJSON(toConvert);
              const parsed = JSON.parse(jsonified);
              if (
                (typeof parsed === "object" && parsed !== null) ||
                Array.isArray(parsed)
              ) {
                this.fixes.push("Converted Python dict syntax to JSON");
                  // Recursively unwrap - this will handle nested stringified JSON
                return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
              }
            } catch (e5) {
                // Python dict conversion failed, try as regular string unwrapping
                // This handles cases where Python dict conversion fails but the string
                // might still contain unwrappable JSON
              }
            }
          }

          // Strategy 5: If the string looks like JSON but parsing failed,
          // it might have unescaped quotes in nested JSON strings.
          // Try fixing unescaped nested JSON iteratively and then parsing.
          const trimmedForFix = current.trim();
          if (
            (trimmedForFix.startsWith("{") || trimmedForFix.startsWith("[")) &&
            trimmedForFix.length > 2
          ) {
            try {
              // Use regex to find and fix patterns like: "key":"{"nested":"value"}"
              // where the nested JSON has unescaped quotes
              let fixed = trimmedForFix;
              let changed = false;
              
              // Pattern: Find "key":"{...}" where {...} is JSON with unescaped quotes
              // Match: :" followed by {, then content, then }"
              fixed = fixed.replace(
                /:"({[^}]*?"[^"]*?"[^}]*?})"/g,
                (match, jsonValue) => {
                  // Check if jsonValue can be parsed - if not, it has unescaped quotes
                  try {
                    JSON.parse(jsonValue);
                    // It parses, so no unescaped quotes
                    return match;
                  } catch (parseErr) {
                    // It doesn't parse - escape all unescaped quotes
                    let escapedValue = "";
                    for (let j = 0; j < jsonValue.length; j++) {
                      if (jsonValue[j] === "\\" && j + 1 < jsonValue.length) {
                        // Preserve escaped sequences
                        escapedValue += jsonValue[j];
                        escapedValue += jsonValue[j + 1];
                        j++;
                        continue;
                      }
                      if (jsonValue[j] === '"') {
                        // This is an unescaped quote - escape it
                        escapedValue += '\\"';
                        changed = true;
                      } else {
                        escapedValue += jsonValue[j];
                      }
                    }
                    return `:"${escapedValue}"`;
                  }
                }
              );
              
              // Also handle patterns where the JSON value spans multiple lines or has nested structures
              // Pattern: "key":"{...}" where {...} might be longer
              // We need a more robust approach - find :"{ and then find the matching }"
              // Iterate multiple times to fix all occurrences
              let moreFixed = fixed;
              let moreChanged = false;
              let maxBraceFixIterations = 20; // Fix up to 20 occurrences
              let iteration = 0;
              
              while (iteration < maxBraceFixIterations) {
                let pos = 0;
                let foundAny = false;
                
                while (pos < moreFixed.length) {
                  // Look for :"{ pattern (colon, quote, opening brace)
                  // This indicates a string value that contains JSON
                  const colonQuoteIndex = moreFixed.indexOf(':"{', pos);
                  if (colonQuoteIndex === -1) break;
                  
                    // Find the matching closing brace (starting from after the {)
                    // Need to track both braces and brackets for nested structures
                    let braceCount = 1;
                    let bracketCount = 0;
                    let jsonEnd = colonQuoteIndex + 3; // After :"{
                    while (jsonEnd < moreFixed.length && (braceCount > 0 || bracketCount > 0)) {
                      if (moreFixed[jsonEnd] === '\\') {
                        jsonEnd += 2; // Skip escaped character
                        continue;
                      }
                      if (moreFixed[jsonEnd] === '{') braceCount++;
                      else if (moreFixed[jsonEnd] === '}') braceCount--;
                      else if (moreFixed[jsonEnd] === '[') bracketCount++;
                      else if (moreFixed[jsonEnd] === ']') bracketCount--;
                      jsonEnd++;
                    }
                  
                    // Check if we found a closing quote after the closing brace
                    if (braceCount === 0 && bracketCount === 0) {
                    // Skip any whitespace after the closing brace
                    let quotePos = jsonEnd;
                    while (quotePos < moreFixed.length && (moreFixed[quotePos] === ' ' || moreFixed[quotePos] === '\n' || moreFixed[quotePos] === '\t')) {
                      quotePos++;
                    }
                    
                    if (quotePos < moreFixed.length && moreFixed[quotePos] === '"') {
                      // Found a complete pattern: :"{...}"
                      // Extract JSON content (from after the opening quote, including the { and closing })
                      // colonQuoteIndex points to :, so colonQuoteIndex+2 is after :", and colonQuoteIndex+3 is after :"{
                      // jsonEnd points to the character AFTER the closing }, so extract to jsonEnd to include the closing }
                      const jsonContent = moreFixed.substring(colonQuoteIndex + 2, jsonEnd);
                      
                      // When JSON content is inside a string value, ALL quotes need to be escaped
                      // Even if the JSON content itself parses, it needs quotes escaped to be valid inside a JSON string
                      // Escape all unescaped quotes in the JSON content
                      let escapedContent = "";
                      let needsEscaping = false;
                      for (let j = 0; j < jsonContent.length; j++) {
                        if (jsonContent[j] === "\\" && j + 1 < jsonContent.length) {
                          // Preserve escaped sequences
                          escapedContent += jsonContent[j];
                          escapedContent += jsonContent[j + 1];
                          j++;
                          continue;
                        }
                        if (jsonContent[j] === '"') {
                          // This quote needs to be escaped (it's inside a JSON string value)
                          escapedContent += '\\"';
                          needsEscaping = true;
                          moreChanged = true;
                          foundAny = true;
                        } else {
                          escapedContent += jsonContent[j];
                        }
                      }
                      
                      if (needsEscaping) {
                        // Replace the content (from after :" to before the closing ")
                        // colonQuoteIndex+2 is after :", jsonEnd is after the closing }, quotePos is the closing quote
                        moreFixed = moreFixed.substring(0, colonQuoteIndex + 2) + 
                                    escapedContent + 
                                    moreFixed.substring(jsonEnd, quotePos) +
                                    moreFixed.substring(quotePos);
                        changed = changed || moreChanged;
                        // Restart from the beginning to find the next occurrence
                        break;
                      } else {
                        pos = quotePos + 1;
                        continue;
                      }
                    }
                  }
                  
                  pos = colonQuoteIndex + 1;
                }
                
                if (!foundAny) break; // No more fixes needed
                iteration++;
              }
              
              fixed = moreFixed;
              
              // If we made changes, try parsing
              if (changed) {
                try {
                  const parsed = JSON.parse(fixed);
                  if (
                    (typeof parsed === "object" && parsed !== null) ||
                    Array.isArray(parsed)
                  ) {
                    this.fixes.push("Fixed unescaped quotes in JSON string values and unwrapped stringified JSON");
                    return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                  }
                } catch (e5simple) {
                  // Simple fix didn't work, try iterative fixUnescapedNestedJSON
                }
              }
              
              // Fallback: Try fixing unescaped nested JSON iteratively
              let previousFixed = "";
              let iterations = 0;
              const maxIterations = 10; // Prevent infinite loops
              
              // Keep fixing until no more changes are made
              while (fixed !== previousFixed && iterations < maxIterations) {
                previousFixed = fixed;
                fixed = this.fixUnescapedNestedJSON(fixed);
                iterations++;
              }
              
              // If fixUnescapedNestedJSON made changes, try parsing
              if (fixed !== trimmedForFix || fixed !== previousFixed) {
                try {
                  const parsed = JSON.parse(fixed);
                  if (
                    (typeof parsed === "object" && parsed !== null) ||
                    Array.isArray(parsed)
                  ) {
                    this.fixes.push("Fixed unescaped quotes in nested JSON and unwrapped stringified JSON");
                    return this.deepUnwrapStringifiedJSON(parsed, depth + 1);
                  }
                } catch (e5a) {
                  // Fixed version still doesn't parse - all strategies failed
                }
              }
            } catch (e5) {
              // Strategy 5 failed
            }
          }

          break;
        }
      }

      return obj;
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.deepUnwrapStringifiedJSON(item, depth + 1));
    } else if (obj !== null && typeof obj === "object") {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.deepUnwrapStringifiedJSON(obj[key], depth + 1);
      }
      return result;
    }

    return obj;
  }

  /**
   * Get enhanced error message with line and column information
   */
  private getEnhancedError(error: Error, jsonString: string): string {
    const errorMsg = error.message;

    // Try to extract line number from error
    const posMatch = errorMsg.match(/position (\d+)/i);
    const lineMatch = errorMsg.match(/line (\d+)/i);

    if (posMatch) {
      const position = parseInt(posMatch[1]);
      const lines = jsonString.substring(0, position).split("\n");
      const lineNum = lines.length;
      const colNum = lines[lines.length - 1].length + 1;
      const problemLine = jsonString.split("\n")[lineNum - 1];

      return (
        `Unable to fix JSON at line ${lineNum}, column ${colNum}:\n` +
        `Error: ${errorMsg}\n` +
        `Problem line: ${problemLine}`
      );
    } else if (lineMatch) {
      const lineNum = parseInt(lineMatch[1]);
      const problemLine = jsonString.split("\n")[lineNum - 1];

      return (
        `Unable to fix JSON at line ${lineNum}:\n` +
        `Error: ${errorMsg}\n` +
        `Problem line: ${problemLine}`
      );
    }

    // Show first few lines of the problematic JSON
    const lines = jsonString.split("\n").slice(0, 5);
    return (
      `Unable to fix JSON:\n` +
      `Error: ${errorMsg}\n\n` +
      `First few lines:\n${lines.map((l, i) => `${i + 1}: ${l}`).join("\n")}`
    );
  }

  /**
   * Convert Python dict syntax to valid JSON
   * Handles: single quotes -> double quotes, True/False/None -> true/false/null
   * Also escapes double quotes that appear inside single-quoted strings
   * And escapes control characters (newlines, tabs, etc.) in string values
   */
  private pythonDictToJSON(pythonStr: string): string {
    let result = pythonStr;
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let escapeNext = false;
    let output = "";

    // Process character by character to handle quotes correctly
    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        // Handle escape sequences - preserve them but convert literal \n, \r, \t to escaped versions
        // When inside a string (after conversion), we need to handle escapes correctly for JSON
        if (inSingleQuote || inDoubleQuote) {
          // We're inside a string (after converting single quotes to double quotes)
          // In JSON, only certain escape sequences are valid: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
          // Single quotes don't need escaping in JSON, so \' should become just '
          if (char === "n") {
            output += "\\n";
          } else if (char === "r") {
            output += "\\r";
          } else if (char === "t") {
            output += "\\t";
          } else if (char === "\\") {
            output += "\\\\";
          } else if (char === '"') {
            output += '\\"';
          } else if (char === "'") {
            // Single quote escape in Python - in JSON, single quotes don't need escaping
            // So \' becomes just '
            output += "'";
          } else if (char === "/") {
            output += "\\/";
          } else {
            // Other escape sequences - preserve as-is (might be \b, \f, \uXXXX, etc.)
            output += "\\" + char;
          }
        } else {
          // Outside strings - preserve escape sequences
          if (char === "n") {
            output += "\\n";
          } else if (char === "r") {
            output += "\\r";
          } else if (char === "t") {
            output += "\\t";
          } else {
            output += "\\" + char;
          }
        }
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      // Handle double quote
      if (char === '"') {
        if (inSingleQuote) {
          // Double quote inside a single-quoted string - needs to be escaped
          // when we convert to JSON (since we'll use double quotes)
          output += '\\"';
          continue;
        } else {
          // Toggle double quote state
          inDoubleQuote = !inDoubleQuote;
          output += char;
          continue;
        }
      }

      // Handle single quote
      if (char === "'") {
        if (inDoubleQuote) {
          // Single quote inside a double-quoted string - keep as is (no escaping needed)
          output += char;
          continue;
        } else {
          // Convert single quote to double quote (Python -> JSON)
          inSingleQuote = !inSingleQuote;
          output += '"';
          continue;
        }
      }

      // Escape control characters when inside a string (after conversion to double quotes)
      if ((inSingleQuote || inDoubleQuote) && (char === "\n" || char === "\r" || char === "\t")) {
        if (char === "\n") {
          output += "\\n";
        } else if (char === "\r") {
          output += "\\r";
        } else if (char === "\t") {
          output += "\\t";
        }
        continue;
      }

      output += char;
    }

    result = output;

    // Replace Python boolean/None literals (only outside strings)
    // We need to be careful not to replace these inside strings
    result = this.replacePythonLiteralsOutsideStrings(result);

    return result;
  }

  /**
   * Replace Python True/False/None with JSON equivalents, only outside of strings
   */
  private replacePythonLiteralsOutsideStrings(str: string): string {
    let result = "";
    let inString = false;
    let escapeNext = false;
    let i = 0;

    while (i < str.length) {
      const char = str[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        result += char;
        i++;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        i++;
        continue;
      }

      if (!inString) {
        // Check for Python literals
        if (
          str.substring(i, i + 4) === "True" &&
          !this.isPartOfWord(str, i, 4)
        ) {
          result += "true";
          i += 4;
          continue;
        }
        if (
          str.substring(i, i + 5) === "False" &&
          !this.isPartOfWord(str, i, 5)
        ) {
          result += "false";
          i += 5;
          continue;
        }
        if (
          str.substring(i, i + 4) === "None" &&
          !this.isPartOfWord(str, i, 4)
        ) {
          result += "null";
          i += 4;
          continue;
        }
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * Check if a match at position is part of a larger word
   */
  private isPartOfWord(str: string, pos: number, len: number): boolean {
    const before = pos > 0 ? str[pos - 1] : "";
    const after = pos + len < str.length ? str[pos + len] : "";
    const wordChar = /[a-zA-Z0-9_]/;
    return wordChar.test(before) || wordChar.test(after);
  }

  /**
   * Preprocess unquoted values - must run BEFORE other fixes
   * Handles cases like: name: John Doe -> name: "John Doe"
   * Now string-aware to avoid corrupting content inside existing string values
   */
  private preprocessUnquotedValues(str: string): string {
    // Protect existing string values from our transformations
    const { protectedStr, strings } = this.protectStrings(str);
    let result = protectedStr;
    let fixed = false;

    // Step 1: Add quotes to unquoted keys
    const beforeKeys = result;

    // Pattern 1a: Numeric keys (pure numbers like 20, 123, etc.)
    result = result.replace(/([{,\n]\s*)(\d+)\s*:/g, '$1"$2":');

    // Pattern 1a0: Closing brace followed by timestamp key (adds comma) - RUN FIRST
    // This must run BEFORE pattern 1a1 to handle } timestamp { case
    // Handles: } 2025-12-08T08: 50: 01.328083971Z ip-10-117-130-63... {
    result = result.replace(
      /}(\s+)(\d{4}-\d{2}-\d{2}T\d{2}:\s*\d{2}:\s*\d+\.\d+Z\s+[a-zA-Z0-9.-]+)\s*{/g,
      (match, whitespace, key) => {
        fixed = true;
        return "}, " + whitespace.trim() + '"' + key + '": {';
      },
    );

    // Pattern 1a1: Complex keys starting with numbers (timestamps, IPs, etc.)
    // Matches: 2025-12-08T08: 50: 01.328083971Z ip-10-117-130-63... {
    // This handles log entries with timestamps and hostnames as keys
    result = result.replace(
      /([{,\n]\s*)(\d{4}-\d{2}-\d{2}T\d{2}:\s*\d{2}:\s*\d+\.\d+Z\s+[a-zA-Z0-9.-]+)\s*{/g,
      '$1"$2": {',
    );
    
    // Pattern 1a3: Closing brace followed by already-quoted timestamp key (adds comma)
    // Handles: } "2025-12-08T08: 50: 01.328083971Z ip-10-117-130-63...": {
    // This handles cases where pattern 1a1 already quoted the key
    result = result.replace(
      /}(\s+)"(\d{4}-\d{2}-\d{2}T\d{2}:\s*\d{2}:\s*\d+\.\d+Z\s+[a-zA-Z0-9.-]+)"\s*:\s*{/g,
      (match, whitespace, key) => {
        fixed = true;
        return "}, " + whitespace.trim() + '"' + key + '": {';
      },
    );

    // Pattern 1b: After {, [, ,, or \n (alphabetic keys)
    result = result.replace(
      /([{,\n]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );

    // Pattern 2: After whitespace (handles keys after comments or indentation)
    // Only match patterns that look like they're outside strings
    result = result.replace(
      /(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      (match, whitespace, key) => {
        if (
          key !== "true" &&
          key !== "false" &&
          key !== "null" &&
          key !== "undefined" &&
          key !== "True" &&
          key !== "False" &&
          key !== "Null" &&
          (whitespace.includes("\n") || whitespace.length > 1)
        ) {
          return whitespace + '"' + key + '":';
        }
        return match;
      },
    );
    if (result !== beforeKeys) {
      fixed = true;
    }

    // Step 2: Handle unquoted multi-word string values
    result = result.replace(
      /:\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)(?=\s*[\n,}])/g,
      (match, value) => {
        fixed = true;
        return ': "' + value + '"';
      },
    );

    // Step 3: Handle unquoted single capitalized word values
    result = result.replace(
      /:\s*([A-Z][a-zA-Z]*)(?=\s*[\n,}\]])/g,
      (match, value) => {
        if (value !== "True" && value !== "False" && value !== "Null") {
          fixed = true;
          return ': "' + value + '"';
        }
        return match;
      },
    );

    // Step 4: Handle unquoted lowercase word values
    result = result.replace(
      /:\s*([a-z][a-zA-Z0-9_]*)(?=\s*[\n,}\]])/g,
      (match, value) => {
        if (
          value !== "true" &&
          value !== "false" &&
          value !== "null" &&
          value !== "undefined"
        ) {
          fixed = true;
          return ': "' + value + '"';
        }
        return match;
      },
    );

    // Step 5: Handle unquoted values in arrays (after [ or ,)
    // Match: [unquoted_item, or , unquoted_item
    result = result.replace(
      /([[,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*[,\]])/g,
      (match, prefix, value) => {
        if (
          value !== "true" &&
          value !== "false" &&
          value !== "null" &&
          value !== "undefined" &&
          value !== "True" &&
          value !== "False" &&
          value !== "None" &&
          value !== "NaN" &&
          value !== "Infinity"
        ) {
          fixed = true;
          return prefix + '"' + value + '"';
        }
        return match;
      },
    );

    if (fixed) {
      this.fixes.push("Added quotes to unquoted values");
    }

    // Restore the protected string values
    return this.restoreStrings(result, strings);
  }

  /**
   * Fix unescaped nested JSON in string values
   */
  private fixUnescapedNestedJSON(str: string): string {
    let result = str;
    let fixed = false;

    const trimmed = result.trim();
    if (
      trimmed.startsWith('"') &&
      trimmed.endsWith('"') &&
      trimmed.length === result.trim().length
    ) {
      return str;
    }

    let output = "";
    let i = 0;

    while (i < result.length) {
      let triggerChar: string | null = null;
      let patternFound = false;
      let whitespaceStart = -1;
      let whitespaceEnd = -1;

      if (
        i > 0 &&
        (result[i] === ":" || result[i] === "," || result[i] === "[")
      ) {
        triggerChar = result[i];
        let j = i + 1;
        whitespaceStart = j;
        while (
          j < result.length &&
          (result[j] === " " || result[j] === "\n" || result[j] === "\t")
        ) {
          j++;
        }
        whitespaceEnd = j;
        if (
          j + 1 < result.length &&
          result[j] === '"' &&
          result[j + 1] === "{"
        ) {
          patternFound = true;
        }
      }

      if (patternFound) {
        const whitespace = result.substring(whitespaceStart, whitespaceEnd);
        let patternStart = triggerChar + whitespace + '"';
        let skipToQuote = whitespaceEnd;

        let j = skipToQuote + 2;
        let hasEscapedQuotes = false;
        let foundUnescapedQuote = false;
        let escapeNext = false;

        // Remove the 500-character limit to handle very long nested JSON strings
        while (j < result.length) {
          if (escapeNext) {
            escapeNext = false;
            j++;
            continue;
          }

          if (result[j] === "\\") {
            escapeNext = true;
            if (j + 1 < result.length && result[j + 1] === '"') {
              hasEscapedQuotes = true;
            }
            j++;
            continue;
          } else if (result[j] === '"') {
            if (j > 0 && result[j - 1] === "\\") {
              hasEscapedQuotes = true;
              j++;
              continue;
            } else {
              foundUnescapedQuote = true;
              break;
            }
          } else if (result[j] === "}") {
            // Check if we're at the end of the nested JSON object
            // Count braces to see if this is the closing brace
            let braceCount = 1;
            let k = skipToQuote + 2;
            while (k < j) {
              if (result[k] === "{") braceCount++;
              else if (result[k] === "}") braceCount--;
              k++;
            }
            if (braceCount === 0) {
              // This is the closing brace, no unescaped quote found before it
            break;
            }
          }
          j++;
        }

        if (foundUnescapedQuote) {
          output += patternStart;
          i = skipToQuote + 1;

          let depth = 0;
          escapeNext = false;

          while (i < result.length) {
            const char = result[i];

            if (escapeNext) {
              output += char;
              escapeNext = false;
              i++;
              continue;
            }

            if (char === "\\") {
              output += char;
              escapeNext = true;
            } else if (char === "{") {
              depth++;
              output += char;
            } else if (char === "}") {
              depth--;
              output += char;

              if (depth === 0) {
                if (i + 1 < result.length && result[i + 1] === '"') {
                  output += '"';
                  i += 2;
                  fixed = true;
                  break;
                }
              }
            } else if (char === '"') {
              output += '\\"';
              fixed = true;
            } else {
              output += char;
            }

            i++;
          }
        } else {
          output += result[i];
          i++;
        }
      } else {
        output += result[i];
        i++;
      }
    }

    if (fixed) {
      this.fixes.push("Fixed unescaped quotes in nested JSON string");
      return output;
    }

    return str;
  }

  /**
   * Handle concatenated JSON objects (NDJSON or direct concatenation like }{)
   * Also handles malformed concatenation where objects are missing closing braces
   */
  private handleConcatenatedJSON(str: string): string {
    const trimmed = str.trim();

    // Check for concatenated objects: }{ or }\s*\n\s*{ or }  {
    // This handles NDJSON format and direct concatenation
    const concatenationPattern = /}\s*{/;

    if (concatenationPattern.test(trimmed)) {
      // Strategy 1: Try splitting at }{ boundaries (handles malformed first objects)
      // This is more aggressive - it splits wherever }{ appears outside strings
      const splitObjects = this.splitAtConcatenationBoundaries(trimmed);

      if (splitObjects.length > 1) {
        // Try to fix each individual object
        const fixedObjects: string[] = [];
        let allValid = true;

        for (const obj of splitObjects) {
          try {
            // Try to parse as-is first
            JSON.parse(obj);
            fixedObjects.push(obj);
          } catch {
            // Try to balance braces for this object
            const balanced = this.balanceBracesForObject(obj);
            try {
              JSON.parse(balanced);
              fixedObjects.push(balanced);
            } catch {
              // If still invalid, try aggressive fix
              try {
                const aggressivelyFixed = this.aggressiveFix(balanced);
                JSON.parse(aggressivelyFixed);
                fixedObjects.push(aggressivelyFixed);
              } catch {
                allValid = false;
                fixedObjects.push(obj); // Keep original
              }
            }
          }
        }

        if (fixedObjects.length > 1) {
          this.fixes.push(
            `Wrapped ${fixedObjects.length} concatenated objects in array`,
          );
          return "[" + fixedObjects.join(",\n") + "]";
        }
      }

      // Strategy 2: Original approach - track depth properly
      const objects: string[] = [];
      let depth = 0;
      let currentObj = "";
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];

        // Handle string boundaries to avoid matching braces inside strings
        if (escapeNext) {
          escapeNext = false;
          currentObj += char;
          continue;
        }

        if (char === "\\" && inString) {
          escapeNext = true;
          currentObj += char;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
        }

        currentObj += char;

        if (!inString) {
          if (char === "{") depth++;
          if (char === "}") {
            depth--;
            if (depth === 0 && currentObj.trim()) {
              objects.push(currentObj.trim());
              currentObj = "";
            }
          }
        }
      }

      // Handle any remaining content
      if (currentObj.trim()) {
        objects.push(currentObj.trim());
      }

      if (objects.length > 1) {
        this.fixes.push(
          `Wrapped ${objects.length} concatenated objects in array`,
        );
        return "[" + objects.join(",\n") + "]";
      }
    }

    return str;
  }

  /**
   * Split string at }{ boundaries (outside of strings)
   */
  private splitAtConcatenationBoundaries(str: string): string[] {
    const objects: string[] = [];
    let current = "";
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        current += char;
        continue;
      }

      if (char === "\\" && inString) {
        escapeNext = true;
        current += char;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        current += char;
        continue;
      }

      // Detect }{ pattern outside of strings
      if (!inString && char === "}" && i + 1 < str.length) {
        // Look ahead for { (possibly with whitespace)
        let j = i + 1;
        while (j < str.length && /\s/.test(str[j])) {
          j++;
        }
        if (j < str.length && str[j] === "{") {
          // Found }{ boundary
          current += char; // Add the }
          if (current.trim()) {
            objects.push(current.trim());
          }
          current = "";
          i = j - 1; // Position at the character before {, loop will increment to {
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      objects.push(current.trim());
    }

    return objects;
  }

  /**
   * Balance braces for a single potentially malformed JSON object
   */
  private balanceBracesForObject(str: string): string {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\" && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") openBraces++;
        if (char === "}") openBraces--;
        if (char === "[") openBrackets++;
        if (char === "]") openBrackets--;
      }
    }

    // Add missing closing braces/brackets
    let result = str;
    while (openBrackets > 0) {
      result += "]";
      openBrackets--;
    }
    while (openBraces > 0) {
      result += "}";
      openBraces--;
    }

    return result;
  }

  /**
   * Handle double-escaped JSON (JSON stringified twice)
   */
  private handleDoubleEscaped(str: string): string {
    const trimmed = str.trim();

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        const unescaped = JSON.parse(trimmed);

        if (
          typeof unescaped === "string" &&
          (unescaped.trim().startsWith("{") || unescaped.trim().startsWith("["))
        ) {
          this.fixes.push("Unwrapped double-escaped JSON");
          return this.handleDoubleEscaped(unescaped);
        } else if (typeof unescaped === "object" && unescaped !== null) {
          const stringified = JSON.stringify(unescaped);
          if (stringified !== trimmed) {
            this.fixes.push("Unwrapped double-escaped JSON");
            return stringified;
          }
        }
      } catch (e) {
        // Not valid JSON string, continue with original
      }
    }

    return str;
  }

  /**
   * Fix JavaScript-specific values: undefined, NaN, Infinity
   */
  private fixJavaScriptLiterals(str: string): string {
    let fixed = false;
    let result = str;

    const beforeNegInf = result;
    result = result.replace(/:\s*-Infinity\b/g, ": null" as string);
    if (result !== beforeNegInf) fixed = true;

    const beforeInf = result;
    result = result.replace(/:\s*Infinity\b/g, ": null");
    if (result !== beforeInf) fixed = true;

    const beforeUndefined = result;
    result = result.replace(/:\s*undefined\b/g, ": null");
    if (result !== beforeUndefined) fixed = true;

    const beforeNaN = result;
    result = result.replace(/:\s*NaN\b/g, ": null");
    if (result !== beforeNaN) fixed = true;

    if (fixed) {
      this.fixes.push(
        "Converted JavaScript literals (undefined/NaN/Infinity) to null",
      );
    }

    return result;
  }

  /**
   * Fix Python-style literals
   */
  private fixPythonLiterals(str: string): string {
    let fixed = false;
    let result = str;

    const beforeBool = result;
    result = result.replace(/\b(True|False)\b/g, (match) => {
      fixed = true;
      return match.toLowerCase();
    });

    const beforeNone = result;
    result = result.replace(/\bNone\b/g, "null");
    if (result !== beforeNone) fixed = true;

    const beforeTuples = result;
    result = result.replace(/:\s*\(([^)]+)\)/g, ": [$1]");
    if (result !== beforeTuples) fixed = true;

    result = result.replace(/0x([0-9A-Fa-f]+)/g, (match, hex) => {
      fixed = true;
      return parseInt(hex, 16).toString();
    });

    if (fixed) {
      this.fixes.push("Converted Python-style literals to JSON format");
    }

    return result;
  }

  /**
   * Remove single-line and multi-line comments
   */
  private removeComments(str: string): string {
    let hasComments = false;

    // Remove multi-line comments (/* ... */) but only if /* is NOT inside a string
    // We need to check the full string, not line by line, because comments can span lines
    let result = "";
    let i = 0;
    while (i < str.length) {
      if (i < str.length - 1 && str[i] === "/" && str[i + 1] === "*") {
        // Check if /* is inside a string
        if (!this.isInString(str, i)) {
          // This is a real comment, skip until we find */
      hasComments = true;
          i += 2; // Skip /*
          while (i < str.length - 1) {
            if (str[i] === "*" && str[i + 1] === "/") {
              i += 2; // Skip */
              break;
            }
            i++;
          }
          continue;
        }
      }
      result += str[i];
      i++;
    }
    str = result;

    const lines = str.split("\n");
    const cleanedLines = lines.map((line) => {
      const arrowIndex = line.indexOf("<--");
      if (arrowIndex !== -1 && !this.isInString(line, arrowIndex)) {
        hasComments = true;
        return line.substring(0, arrowIndex);
      }

      const slashIndex = line.indexOf("//");
      if (slashIndex !== -1 && !this.isInString(line, slashIndex)) {
        hasComments = true;
        return line.substring(0, slashIndex);
      }

      const hashIndex = line.indexOf("#");
      if (hashIndex !== -1 && !this.isInString(line, hashIndex)) {
        hasComments = true;
        return line.substring(0, hashIndex);
      }

      return line;
    });

    if (hasComments) {
      this.fixes.push("Removed comments from JSON");
    }

    return cleanedLines.join("\n");
  }

  /**
   * Remove garbage characters in the middle of JSON structure
   * Handles patterns like: "value" [ ] } , -> "value",
   */
  private removeMiddleGarbage(str: string): string {
    let result = str;
    let fixed = false;

    // Pattern 1: Remove standalone empty brackets/braces followed by comma
    // "value" [ ] } , -> "value",
    result = result.replace(/"([^"]+)"\s*\[\s*\]\s*\}\s*,/g, (match) => {
      fixed = true;
      return match.replace(/\s*\[\s*\]\s*\}\s*,/, ",");
    });

    // Pattern 2: Remove empty brackets/braces between values and next property
    // "value" [ ] } "next" -> "value", "next"
    result = result.replace(/"([^"]+)"\s*\[\s*\]\s*\}\s*"/g, (match) => {
      fixed = true;
      return match.replace(/\s*\[\s*\]\s*\}\s*/, ", ");
    });

    // Pattern 3: Remove standalone brackets/braces with spaces
    // "value" [ ] } -> "value",
    result = result.replace(/"([^"]+)"\s*\[\s*\]\s*\}/g, (match) => {
      fixed = true;
      return match.replace(/\s*\[\s*\]\s*\}/, ",");
    });

    // Pattern 4: Remove garbage brackets between closing brace and next property
    // } [ ] "key" -> }, "key"
    result = result.replace(/\}\s*\[\s*\]\s*"/g, (match) => {
      fixed = true;
      return '}, "';
    });

    // Pattern 5: Remove garbage brackets between closing bracket and next property
    // ] [ ] "key" -> ], "key"
    result = result.replace(/\]\s*\[\s*\]\s*"/g, (match) => {
      fixed = true;
      return '], "';
    });

    if (fixed) {
      this.fixes.push("Removed garbage characters from JSON structure");
    }

    return result;
  }

  /**
   * Trim trailing garbage after a complete JSON structure
   */
  private trimTrailingGarbage(str: string): string {
    let result = str.trim();
    let fixed = false;

    if (!result.startsWith("{") && !result.startsWith("[")) {
      return str;
    }

    const beforePatterns = result;
    const emptyPairs = "(?:\\[\\s*\\]|\\{\\s*\\})";

    result = result.replace(
      new RegExp(`}\\s*${emptyPairs}+\\s*,?\\s*}`, "g"),
      "}}",
    );
    result = result.replace(
      new RegExp(`]\\s*${emptyPairs}+\\s*,?\\s*]`, "g"),
      "]]",
    );
    result = result.replace(
      new RegExp(`}\\s*${emptyPairs}+\\s*,?\\s*]`, "g"),
      "}]",
    );
    result = result.replace(
      new RegExp(`]\\s*${emptyPairs}+\\s*,?\\s*}`, "g"),
      "]}",
    );
    result = result.replace(
      new RegExp(`([}\\]])\\s*${emptyPairs}+\\s*,?\\s*(?=\\n\\s*")`, "g"),
      "$1",
    );
    result = result.replace(
      new RegExp(`([}\\]])\\s*${emptyPairs}+\\s*,?\\s*(?=")`, "g"),
      "$1",
    );

    if (result !== beforePatterns) {
      fixed = true;
    }

    let depth = 0;
    let inString = false;
    let escape = false;
    let firstValidEnd = -1;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === "\\") {
        escape = true;
        continue;
      }

      if (char === '"' && !escape) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{" || char === "[") {
          depth++;
        } else if (char === "}" || char === "]") {
          depth--;
          if (depth === 0) {
            firstValidEnd = i;
            break;
          } else if (depth < 0) {
            break;
          }
        }
      }
    }

    if (firstValidEnd !== -1 && firstValidEnd < result.length - 1) {
      const afterMain = result.substring(firstValidEnd + 1);
      const afterMainTrimmed = afterMain.trim();

      if (afterMainTrimmed.length > 0) {
        const isStructuralGarbage = /^[,\s{}\[\]]+$/.test(afterMainTrimmed);
        const isTextGarbage =
          !afterMainTrimmed.startsWith("{") &&
          !afterMainTrimmed.startsWith("[");

        if (isStructuralGarbage || isTextGarbage) {
          result = result.substring(0, firstValidEnd + 1);
          fixed = true;
        }
      }
    }

    if (fixed) {
      this.fixes.push("Removed garbage characters from JSON structure");
    }

    return result;
  }

  /**
   * Fix array-style key-value pairs
   * Handles both single [key:value] and multiple [key1:value1 key2:value2 ...]
   */
  private fixArrayStyleKeyValue(str: string): string {
    let result = str;
    let fixed = false;

    // Pattern 1: Multiple key-value pairs: [key1:value1 key2:value2 ...]
    // This matches arrays containing space-separated key:value pairs
    const multiPattern =
      /\[([a-zA-Z_0-9]+\s*:\s*(?:"[^"]*"|[a-zA-Z_0-9]+)(?:\s+[a-zA-Z_0-9]+\s*:\s*(?:"[^"]*"|[a-zA-Z_0-9]+))*)\s*\]/g;

    const beforeMultiFix = result;
    result = result.replace(multiPattern, (match) => {
      fixed = true;
      // Extract all key:value pairs
      const pairs = match.match(
        /([a-zA-Z_0-9]+)\s*:\s*("[^"]*"|[a-zA-Z_0-9]+)/g,
      );
      if (pairs && pairs.length > 0) {
        const objPairs = pairs.map((pair) => {
          const [key, ...valueParts] = pair.split(":");
          const value = valueParts.join(":").trim();
          // Ensure key and value are properly quoted if needed
          const quotedKey =
            /^[0-9]/.test(key.trim()) || !/^[a-zA-Z_]/.test(key.trim())
              ? `"${key.trim()}"`
              : key.trim();
          const quotedValue =
            value.startsWith('"') ||
            /^[0-9]/.test(value) ||
            value === "true" ||
            value === "false" ||
            value === "null"
              ? value
              : `"${value}"`;
          return `${quotedKey}:${quotedValue}`;
        });
        return "{" + objPairs.join(", ") + "}";
      }
      return match;
    });

    if (result !== beforeMultiFix) {
      this.fixes.push(
        "Converted array-style [key:value] to object {key:value}",
      );
    }

    // Pattern 2: Single key-value pair: [key:value] (original pattern, kept for compatibility)
    const singlePattern =
      /\[(\s*)([a-zA-Z_0-9]+)(\s*):(\s*)([a-zA-Z_0-9]+|"[^"]*")(\s*)\]/g;

    const beforeSingleFix = result;
    result = result.replace(
      singlePattern,
      (match, ws1, key, ws2, ws3, value, ws4) => {
        if (!fixed) {
          // Only fix if multi-pattern didn't already fix it
          fixed = true;
          // Ensure key is quoted if it starts with a number
          const quotedKey = /^[0-9]/.test(key) ? `"${key}"` : key;
          return "{" + ws1 + quotedKey + ws2 + ":" + ws3 + value + ws4 + "}";
        }
        return match;
      },
    );

    if (result !== beforeSingleFix && !fixed) {
      this.fixes.push(
        "Converted array-style [key:value] to object {key:value}",
      );
    }

    return result;
  }

  /**
   * Fix invalid escape sequences like \%XX (backslash before percent-encoded chars)
   * This happens when URL-encoded content is incorrectly escaped in JSON
   * Example: \"url\":\"https://example.com?x=1\%22,\%22y\%22:2\" should become
   *          \"url\":\"https://example.com?x=1%22,%22y%22:2\"
   */
  private fixInvalidEscapeSequences(str: string): string {
    let fixed = false;
    let result = str;

    // Fix \%XX patterns - remove the backslash before percent-encoded sequences
    // This handles cases like \%22 (invalid escape) -> %22 (valid)
    const beforeFix = result;
    result = result.replace(/\\(%[0-9A-Fa-f]{2})/g, (match, encoded) => {
      fixed = true;
      return encoded;
    });

    if (fixed) {
      this.fixes.push(
        "Fixed invalid escape sequences (removed backslash before URL-encoded chars)",
      );
    }

    return result;
  }

  /**
   * Fix improperly closed strings ending with %22, or …, followed by quote+key
   * Pattern: "key": "value%22,"nextKey" -> "key": "value","nextKey"
   * Pattern: "key": "value…,"nextKey" -> "key": "value…","nextKey"
   * Also handles: with newlines/whitespace between
   * This handles cases where URL-encoded quotes or truncated URLs cause the string to not be properly closed
   */
  private fixImproperlyClosedURLStrings(str: string): string {
    let fixed = false;
    let result = str;

    // Pattern 1: "key": "value%22,"nextKey" (no newlines)
    // Match: string value ending with %22, followed by comma, quote and key name
    const pattern1 = /(":\s*"(?:[^"\\]|\\.)*?)%22,("[\w]+":)/g;

    result = result.replace(pattern1, (match, stringContent, nextKey) => {
      fixed = true;
      return stringContent + '",' + nextKey;
    });

    // Pattern 2: "key": "value%22,\n\n    "nextKey" (with newlines/whitespace between)
    // Match: string value ending with %22, followed by comma, whitespace/newlines, quote and key name
    const pattern2 = /(":\s*"(?:[^"\\]|\\.)*?)%22,(\s*"[\w]+":)/g;

    result = result.replace(pattern2, (match, stringContent, nextKey) => {
      fixed = true;
      return stringContent + '",' + nextKey;
    });

    // Pattern 3: "key": "value…,"nextKey" (ellipsis + comma, no closing quote)
    // This handles truncated URLs that end with ellipsis
    const pattern3 = /(":\s*"(?:[^"\\]|\\.)*?)…,("[\w]+":)/g;

    result = result.replace(pattern3, (match, stringContent, nextKey) => {
      fixed = true;
      return stringContent + '…",' + nextKey;
    });

    // Pattern 4: "key": "value…,\n\n    "nextKey" (ellipsis with newlines/whitespace)
    const pattern4 = /(":\s*"(?:[^"\\]|\\.)*?)…,(\s*"[\w]+":)/g;

    result = result.replace(pattern4, (match, stringContent, nextKey) => {
      fixed = true;
      return stringContent + '…",' + nextKey;
    });

    if (fixed) {
      this.fixes.push(
        "Fixed improperly closed strings with URL-encoded quotes or truncated URLs",
      );
    }

    return result;
  }

  /**
   * Fix illegal hex escapes (\xNN -> \u00NN)
   */
  private fixIllegalHexEscapes(str: string): string {
    let fixed = false;

    const result = str.replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => {
      fixed = true;
      return "\\u00" + hex;
    });

    if (fixed) {
      this.fixes.push(
        "Converted illegal \\x hex escapes to \\u Unicode escapes",
      );
    }

    return result;
  }

  /**
   * Check if a position in a string is inside a quoted string
   */
  private isInString(line: string, pos: number): boolean {
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < pos; i++) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (line[i] === "\\") {
        escapeNext = true;
        continue;
      }

      if (line[i] === '"' || line[i] === "'") {
        inString = !inString;
      }
    }

    return inString;
  }

  /**
   * Convert single quotes to double quotes (outside of strings)
   */
  private fixQuotes(str: string): string {
    let result = "";
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let escapeNext = false;
    let fixedQuotes = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        result += char;
      } else if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        result += '"';
        fixedQuotes = true;
      } else {
        result += char;
      }
    }

    if (fixedQuotes) {
      this.fixes.push("Converted single quotes to double quotes");
    }

    return result;
  }

  /**
   * Remove trailing commas before closing braces/brackets
   */
  private removeTrailingCommas(str: string): string {
    let fixedTrailing = false;
    let result = str;

    const beforeMultiple = result;
    result = result.replace(/,{2,}/g, ",");
    if (result !== beforeMultiple) fixedTrailing = true;

    const beforeLeading = result;
    result = result.replace(/([{\[])\s*,/g, "$1");
    if (result !== beforeLeading) fixedTrailing = true;

    const beforeTrailing = result;
    result = result.replace(/,(\s*[}\]])/g, (match, closing) => {
      return closing;
    });
    if (result !== beforeTrailing) fixedTrailing = true;

    if (fixedTrailing) {
      this.fixes.push("Removed trailing/multiple/leading commas");
    }

    return result;
  }

  /**
   * Fix numbers with spaces (European format)
   */
  private fixNumbersWithSpaces(str: string): string {
    let fixed = false;

    const result = str.replace(/(\d)\s+(\d)/g, (match, digit1, digit2) => {
      fixed = true;
      return digit1 + digit2;
    });

    if (fixed) {
      this.fixes.push("Removed spaces from numbers");
    }

    return result;
  }

  /**
   * Fix various number format issues
   */
  private fixNumberFormats(str: string): string {
    let result = str;
    let fixed = false;

    // Fix 1: Remove plus signs from positive numbers: +123 -> 123
    const beforePlus = result;
    result = result.replace(/:\s*\+(\d)/g, ": $1");
    if (result !== beforePlus) {
      this.fixes.push("Removed plus signs from numbers");
      fixed = true;
    }

    // Fix 2: Remove leading zeros (but keep "0" and decimals like "0.5")
    // Pattern: :007 -> :7, but keep :0 and :0.5
    const beforeZeros = result;
    result = result.replace(/:\s*0+(\d+)/g, (match, digits) => {
      // Don't fix if it's "0" followed by decimal point or just "0"
      if (digits === "0" || match.includes(".")) {
        return match;
      }
      fixed = true;
      return ": " + digits;
    });
    if (result !== beforeZeros && !fixed) {
      this.fixes.push("Removed leading zeros from numbers");
      fixed = true;
    }

    // Fix 3: Fix trailing decimal points: 123. -> 123.0
    const beforeDecimals = result;
    result = result.replace(/(\d+\.)(\s*[,}\]])/g, (match, number, after) => {
      fixed = true;
      return number + "0" + after;
    });
    if (result !== beforeDecimals && !fixed) {
      this.fixes.push("Fixed trailing decimal points");
      fixed = true;
    }

    return result;
  }

  /**
   * Remove BOM (Byte Order Mark) if present at the start
   */
  private removeBOM(str: string): string {
    if (str.charCodeAt(0) === 0xfeff) {
      this.fixes.push("Removed BOM (Byte Order Mark)");
      return str.slice(1);
    }
    return str;
  }

  /**
   * Extract and protect string values before running structural patterns
   * Returns: { protectedStr: string with placeholders, strings: array of extracted strings }
   */
  private protectStrings(str: string): {
    protectedStr: string;
    strings: string[];
  } {
    const strings: string[] = [];
    let result = "";
    let inString = false;
    let currentString = "";
    let quoteChar = "";
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        if (inString) currentString += char;
        else result += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        if (inString) currentString += char;
        else result += char;
        escapeNext = true;
        continue;
      }

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        quoteChar = char;
        currentString = char; // Include the opening quote
      } else if (char === quoteChar && inString) {
        currentString += char; // Include the closing quote
        // Store the complete string and replace with placeholder
        // Use a unique placeholder that won't match any structural patterns
        const placeholder = `###JSONFIX_PROTECTED_STR_${strings.length}###`;
        strings.push(currentString);
        result += placeholder;
        inString = false;
        currentString = "";
        quoteChar = "";
      } else if (inString) {
        currentString += char;
      } else {
        result += char;
      }
    }

    // Handle unclosed string
    if (inString) {
      result += currentString;
    }

    return { protectedStr: result, strings };
  }

  /**
   * Restore string values from placeholders
   */
  private restoreStrings(str: string, strings: string[]): string {
    let result = str;
    for (let i = 0; i < strings.length; i++) {
      result = result.replace(`###JSONFIX_PROTECTED_STR_${i}###`, strings[i]);
    }
    return result;
  }

  /**
   * Add missing commas between array/object elements
   * Now string-aware to avoid corrupting content inside string values
   */
  private addMissingCommas(str: string): string {
    let fixedCommas = false;

    // Protect string values from structural patterns
    const { protectedStr, strings } = this.protectStrings(str);
    let result = protectedStr;

    result = result.replace(/}(\s*\n+\s*){/g, (match, whitespace) => {
      fixedCommas = true;
      return "},\n{";
    });

    // Pattern for closing brace followed by quoted key (handles log entries and other cases)
    // Handles: } "key": or } "2025-12-08T08: 50: 01.328083971Z ip-10-117-130-63...": {
    // This runs after preprocessUnquotedValues, so keys are already quoted
    // Match: } followed by whitespace, then a quoted key (any characters except quotes and colons)
    result = result.replace(
      /}(\s+)"([^":]+)"\s*:/g,
      (match, whitespace, key) => {
        // Skip if this looks like it's already been processed (has comma) or is inside an array
        if (match.startsWith('},')) {
          return match;
        }
        fixedCommas = true;
        // Preserve the whitespace (including newlines) but add comma
        return "}," + whitespace + '"' + key + '":';
      },
    );

    result = result.replace(
      /}(\s+){(?=\s*###JSONFIX_PROTECTED_STR_)/g,
      (match, whitespace) => {
        if (!whitespace.includes("\n") && whitespace.trim() === "") {
          fixedCommas = true;
          return "}, {";
        }
        return match;
      },
    );

    result = result.replace(/](\s*\n+\s*)\[/g, (match, whitespace) => {
      fixedCommas = true;
      return "],\n[";
    });

    result = result.replace(/}(\s*\n+\s*)\[/g, (match, whitespace) => {
      fixedCommas = true;
      return "},\n[";
    });

    result = result.replace(/](\s*\n+\s*){/g, (match, whitespace) => {
      fixedCommas = true;
      return "],\n{";
    });

    result = result.replace(
      /](\s+){(?=\s*###JSONFIX_PROTECTED_STR_)/g,
      (match, whitespace) => {
        if (!whitespace.includes("\n") && whitespace.trim() === "") {
          fixedCommas = true;
          return "], {";
        }
        return match;
      },
    );

    // Now these patterns only work on placeholders (structural level), not inside strings!
    result = result.replace(
      /###JSONFIX_PROTECTED_STR_(\d+)###(\s+)###JSONFIX_PROTECTED_STR_(\d+)###/g,
      (match, id1, whitespace, id2) => {
        if (!whitespace.includes(",") && whitespace.trim() === "") {
          fixedCommas = true;
          return `###JSONFIX_PROTECTED_STR_${id1}###, ###JSONFIX_PROTECTED_STR_${id2}###`;
        }
        return match;
      },
    );

    result = result.replace(
      /###JSONFIX_PROTECTED_STR_(\d+)###(\s*\n+\s*)###JSONFIX_PROTECTED_STR_(\d+)###/g,
      (match, id1, whitespace, id2) => {
        fixedCommas = true;
        return `###JSONFIX_PROTECTED_STR_${id1}###,\n###JSONFIX_PROTECTED_STR_${id2}###`;
      },
    );

    // These patterns work on placeholders - no risk of corrupting string content
    result = result.replace(
      /(\d)(\s*\n+\s*)###JSONFIX_PROTECTED_STR_/g,
      (match, digit, whitespace) => {
        fixedCommas = true;
        return digit + ",\n###JSONFIX_PROTECTED_STR_";
      },
    );

    result = result.replace(
      /(true|false|null)(\s*\n+\s*)###JSONFIX_PROTECTED_STR_/g,
      (match, value, whitespace) => {
        fixedCommas = true;
        return value + ",\n###JSONFIX_PROTECTED_STR_";
      },
    );

    result = result.replace(
      /\](\s*\n+\s*)###JSONFIX_PROTECTED_STR_/g,
      (match, whitespace) => {
        fixedCommas = true;
        return "],\n###JSONFIX_PROTECTED_STR_";
      },
    );

    result = result.replace(
      /}(\s*\n+\s*)###JSONFIX_PROTECTED_STR_/g,
      (match, whitespace) => {
        fixedCommas = true;
        return "},\n###JSONFIX_PROTECTED_STR_";
      },
    );

    result = result.replace(
      /\](\s)###JSONFIX_PROTECTED_STR_/g,
      (match, whitespace) => {
        if (!whitespace.includes("\n") && !whitespace.includes(",")) {
          fixedCommas = true;
          return "], ###JSONFIX_PROTECTED_STR_";
        }
        return match;
      },
    );

    result = result.replace(
      /}(\s)###JSONFIX_PROTECTED_STR_/g,
      (match, whitespace) => {
        if (!whitespace.includes("\n") && !whitespace.includes(",")) {
          fixedCommas = true;
          return "}, ###JSONFIX_PROTECTED_STR_";
        }
        return match;
      },
    );

    // Pattern: } unquotedKey: -> }, unquotedKey: (works on protected string, safe)
    result = result.replace(
      /}(\s+)([a-zA-Z_][a-zA-Z_0-9]*)\s*:/g,
      (match, whitespace, key) => {
        if (!whitespace.includes("\n") && !whitespace.includes(",")) {
          fixedCommas = true;
          return "}, " + whitespace.trim() + key + ":";
        }
        return match;
      },
    );

    // Pattern: ] unquotedKey: -> ], unquotedKey: (works on protected string, safe)
    result = result.replace(
      /\](\s+)([a-zA-Z_][a-zA-Z_0-9]*)\s*:/g,
      (match, whitespace, key) => {
        if (!whitespace.includes("\n") && !whitespace.includes(",")) {
          fixedCommas = true;
          return "], " + whitespace.trim() + key + ":";
        }
        return match;
      },
    );

    // Pattern: placeholder followed by unquoted key -> placeholder, key (string before unquoted key)
    result = result.replace(
      /###JSONFIX_PROTECTED_STR_(\d+)###(\s+)([a-zA-Z_])/g,
      (match, id, whitespace, letter) => {
        if (!whitespace.includes("\n")) {
          fixedCommas = true;
          return `###JSONFIX_PROTECTED_STR_${id}###,` + whitespace + letter;
        }
        return match;
      },
    );

    // Pattern: digit followed by unquoted key -> digit, key (number before unquoted key)
    result = result.replace(
      /(\d)(\s+)([a-zA-Z_])/g,
      (match, digit, whitespace, letter) => {
        if (!whitespace.includes("\n")) {
          fixedCommas = true;
          return digit + "," + whitespace + letter;
        }
        return match;
      },
    );

    // Pattern: digit followed by structural elements (now using placeholders)
    result = result.replace(
      /(\d)(\s+)(###JSONFIX_PROTECTED_STR_|true|false|null|{|\[)/g,
      (match, digit, whitespace, next) => {
        if (!whitespace.includes(",")) {
          fixedCommas = true;
          return digit + ", " + next;
        }
        return match;
      },
    );

    // Pattern: keywords followed by structural elements
    result = result.replace(
      /(true|false|null)(\s+)(###JSONFIX_PROTECTED_STR_|\d|{|\[)/g,
      (match, value, whitespace, next) => {
        if (!whitespace.includes(",")) {
          fixedCommas = true;
          return value + ", " + next;
        }
        return match;
      },
    );

    result = result.replace(
      /(true|false|null)(\s+)(true|false|null)/g,
      (match, value, whitespace, next) => {
        if (!whitespace.includes(",")) {
          fixedCommas = true;
          return value + ", " + next;
        }
        return match;
      },
    );

    // Pattern: placeholder followed by keywords/numbers/braces
    result = result.replace(
      /###JSONFIX_PROTECTED_STR_(\d+)###(\s+)(true|false|null|\d|{|\[)/g,
      (match, id, whitespace, next) => {
        if (!whitespace.includes(",") && !whitespace.includes("\n")) {
          fixedCommas = true;
          return `###JSONFIX_PROTECTED_STR_${id}###, ` + next;
        }
        return match;
      },
    );

    // Restore the original string values
    let finalResult = this.restoreStrings(result, strings);

    if (fixedCommas) {
      this.fixes.push("Added missing commas");
    }

    return finalResult;
  }

  /**
   * Fix raw control characters (newlines, tabs, carriage returns) inside strings
   * These should be escaped as \n, \t, \r in JSON
   */
  private fixRawControlChars(str: string): string {
    let result = "";
    let inString = false;
    let escapeNext = false;
    let hasChanges = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const charCode = char.charCodeAt(0);

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      // Handle raw control characters inside strings
      if (inString) {
        if (charCode === 10) {
          // Raw newline (\n)
          result += "\\n";
          hasChanges = true;
          continue;
        }
        if (charCode === 13) {
          // Raw carriage return (\r)
          result += "\\r";
          hasChanges = true;
          continue;
        }
        if (charCode === 9) {
          // Raw tab (\t)
          result += "\\t";
          hasChanges = true;
          continue;
        }
        // Handle other control characters (0x00-0x1F except the ones above)
        if (
          charCode < 32 &&
          charCode !== 10 &&
          charCode !== 13 &&
          charCode !== 9
        ) {
          result += "\\u" + charCode.toString(16).padStart(4, "0");
          hasChanges = true;
          continue;
        }
      }

      result += char;
    }

    if (hasChanges) {
      this.fixes.push("Escaped raw control characters in strings");
    }

    return result;
  }

  /**
   * Fix empty/missing values in JSON
   * Handles patterns like {"a": , "b": } by replacing empty values with null
   * Also removes multiple consecutive commas in objects (invalid syntax)
   */
  private fixEmptyValues(str: string): string {
    let result = str;
    let hasChanges = false;

    // Pattern 1: value followed by comma with nothing in between (in objects)
    // {"a": , "b": 1} -> {"a": null, "b": 1}
    const emptyValueComma = /:\s*,/g;
    if (emptyValueComma.test(result)) {
      result = result.replace(emptyValueComma, ": null,");
      hasChanges = true;
    }

    // Pattern 2: value at end of object with nothing
    // {"a": 1, "b": } -> {"a": 1, "b": null}
    const emptyValueEnd = /:\s*}/g;
    if (emptyValueEnd.test(result)) {
      result = result.replace(emptyValueEnd, ": null}");
      hasChanges = true;
    }

    // Pattern 3: Multiple consecutive commas in objects - remove them
    // {"a": 1,, "b": 2} -> {"a": 1, "b": 2}
    // But we need to be careful: in arrays [1,,3] should become [1,null,3]
    // Detect if we're in an array context or object context
    // Simple approach: if ,, is followed by " or } it's likely in an object
    // For now, let's just remove multiple commas that look like object context
    let prevResult = "";
    while (prevResult !== result) {
      prevResult = result;
      // Remove ,, or , , when followed by a quoted key or closing brace
      result = result.replace(/,\s*,(\s*["}\]])/g, ",$1");
    }

    // Pattern 4: In arrays, empty elements should be null
    // [1, , 3] -> [1, null, 3]
    // We need to detect array context - look for pattern after [ or after array element
    // This is tricky, so let's handle arrays separately
    result = this.fixEmptyArrayElements(result);

    if (hasChanges) {
      this.fixes.push("Replaced empty values with null");
    }

    return result;
  }

  /**
   * Fix empty array elements specifically
   * [1, , 3] -> [1, null, 3]
   */
  private fixEmptyArrayElements(str: string): string {
    let result = str;
    let hasChanges = false;
    let inArray = false;
    let bracketDepth = 0;
    let braceDepth = 0;
    let inString = false;
    let escapeNext = false;
    let output = "";
    let i = 0;

    while (i < str.length) {
      const char = str[i];

      if (escapeNext) {
        output += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === "\\") {
        output += char;
        escapeNext = true;
        i++;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        output += char;
        i++;
        continue;
      }

      if (inString) {
        output += char;
        i++;
        continue;
      }

      if (char === "[") {
        bracketDepth++;
        inArray = bracketDepth > braceDepth;
        output += char;
        i++;
        continue;
      }

      if (char === "]") {
        bracketDepth--;
        inArray = bracketDepth > braceDepth;
        output += char;
        i++;
        continue;
      }

      if (char === "{") {
        braceDepth++;
        output += char;
        i++;
        continue;
      }

      if (char === "}") {
        braceDepth--;
        output += char;
        i++;
        continue;
      }

      // Check for empty array elements: [,  or , ,
      if (inArray && char === ",") {
        // Look ahead for another comma or ]
        let j = i + 1;
        while (j < str.length && /\s/.test(str[j])) j++;

        if (j < str.length && (str[j] === "," || str[j] === "]")) {
          // Empty element - add null
          output += char + " null";
          hasChanges = true;
          i++;
          continue;
        }
      }

      // Check for leading empty: [,
      if (char === "[") {
        let j = i + 1;
        while (j < str.length && /\s/.test(str[j])) j++;
        if (j < str.length && str[j] === ",") {
          output += char + "null";
          hasChanges = true;
          i++;
          continue;
        }
      }

      output += char;
      i++;
    }

    if (hasChanges) {
      this.fixes.push("Added null for empty array elements");
    }

    return output;
  }

  /**
   * Fix common escaping issues
   */
  private fixEscaping(str: string): string {
    let result = "";
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
      }

      result += char;
    }

    return result;
  }

  /**
   * Fix malformed double-escaped quotes
   * Pattern \\" inside a string should be \\\" to properly escape both backslash and quote
   * This handles cases where double-escaped JSON has incorrect quote escaping
   *
   * The pattern \\" is problematic because:
   * - \\ is an escaped backslash (becomes single \)
   * - " then closes the string
   * We need to convert \\" to \\\" so the quote is also escaped
   */
  private fixMalformedDoubleEscapes(str: string): string {
    // Check if there's a potential malformed double-escape pattern
    // Pattern: \\" (two backslashes followed by quote)
    if (!str.includes('\\"')) {
      return str;
    }

    // Use placeholder approach to avoid confusing escape sequences
    // Replace \\ with unique placeholder, then fix \" patterns, then restore
    const BACKSLASH_PLACEHOLDER = "\x00BKSL\x00";
    let result = str;

    // Replace all \\ with placeholder
    result = result.replace(/\\\\/g, BACKSLASH_PLACEHOLDER);

    // Now look for patterns where PLACEHOLDER" should be PLACEHOLDER\"
    // This happens in nested JSON strings like: "{PLACEHOLDER"key...
    // Check if we have patterns suggesting nested JSON with bad escaping
    if (
      result.includes('"{' + BACKSLASH_PLACEHOLDER + '"') ||
      result.includes(BACKSLASH_PLACEHOLDER + '"}') ||
      result.includes(BACKSLASH_PLACEHOLDER + '": ' + BACKSLASH_PLACEHOLDER) ||
      result.includes(BACKSLASH_PLACEHOLDER + '", ' + BACKSLASH_PLACEHOLDER)
    ) {
      // Replace PLACEHOLDER" with PLACEHOLDER\" in these contexts
      result = result.replace(
        new RegExp(BACKSLASH_PLACEHOLDER + '"', "g"),
        BACKSLASH_PLACEHOLDER + '\\"',
      );
      this.fixes.push("Fixed malformed double-escaped quotes");
    }

    // Restore backslashes
    result = result.replace(new RegExp(BACKSLASH_PLACEHOLDER, "g"), "\\\\");

    return result;
  }

  /**
   * Balance braces and brackets by adding missing closing ones
   * Handles missing closing braces/brackets in the MIDDLE of JSON structure
   * Uses iterative approach to handle multiple missing braces
   */
  private balanceBraces(str: string): string {
    let result = str;
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      const fixResult = this.balanceBracesOnce(result);

      if (fixResult.result === result) {
        // No changes made, we're done
        break;
      }

      result = fixResult.result;

      // If we successfully parsed, we're done
      try {
        JSON.parse(result);
        break;
      } catch (e) {
        // Continue fixing
      }
    }

    return result;
  }

  /**
   * Single pass of brace balancing
   */
  private balanceBracesOnce(str: string): { result: string; changed: boolean } {
    const stack: Array<{ char: string; position: number }> = [];
    const insertions: Array<{ pos: number; char: string }> = [];
    let inString = false;
    let escapeNext = false;
    let result = str;
    let changed = false;

    // Single pass: track braces and detect mismatches
    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{" || char === "[") {
          stack.push({ char, position: i });
        } else if (char === "}" || char === "]") {
          if (stack.length > 0) {
            const top = stack[stack.length - 1];
            const expected = top.char === "{" ? "}" : "]";

            if (char === expected) {
              // Matching - pop the stack
              stack.pop();
            } else {
              // Mismatch - we need to insert the missing closing brace/bracket
              // Insert before current position
              insertions.push({ pos: i, char: expected });
              stack.pop();
              // Don't consume current char - it will be processed in next iteration
            }
          }
          // If stack is empty and we see a closing brace, it's extra - will be handled by removal logic
        } else if (char === ",") {
          // Check for missing } before , in arrays
          // Pattern: { "key": "value" , { (missing } before ,)
          if (stack.length >= 2) {
            const top = stack[stack.length - 1];
            const parent = stack[stack.length - 2];

            // If we're in an object inside an array, and we see a comma,
            // check if the next non-whitespace is { (new object)
            if (top.char === "{" && parent.char === "[") {
              let j = i + 1;
              while (j < result.length && /\s/.test(result[j])) j++;

              if (j < result.length && result[j] === "{") {
                // Missing } before , - insert it
                insertions.push({ pos: i, char: "}" });
                stack.pop();
              }
            }
          }
        }
      }
    }

    // Add any remaining unclosed braces at the end
    while (stack.length > 0) {
      const open = stack.pop();
      const close = open!.char === "{" ? "}" : "]";
      insertions.push({ pos: result.length, char: close });
    }

    // Apply insertions (reverse order to maintain positions)
    insertions.sort((a, b) => b.pos - a.pos);

    // Remove duplicates
    const seen = new Set<number>();
    const uniqueInsertions = insertions.filter((ins) => {
      if (seen.has(ins.pos)) return false;
      seen.add(ins.pos);
      return true;
    });

    for (const ins of uniqueInsertions) {
      result = result.slice(0, ins.pos) + ins.char + result.slice(ins.pos);
      this.fixes.push(`Added missing closing '${ins.char}'`);
      changed = true;
    }

    // Now remove any extra closing braces/brackets
    const extraClosing: number[] = [];
    stack.length = 0;
    inString = false;
    escapeNext = false;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{" || char === "[") {
          stack.push({ char, position: i });
        } else if (char === "}" || char === "]") {
          if (stack.length > 0) {
            const expected = stack[stack.length - 1].char === "{" ? "}" : "]";
            if (char === expected) {
              stack.pop();
            } else {
              // Wrong type of closing - mark for removal
              extraClosing.push(i);
            }
          } else {
            // Extra closing with nothing to close
            extraClosing.push(i);
          }
        }
      }
    }

    // Remove extra closing braces (reverse order)
    if (extraClosing.length > 0) {
      const chars = result.split("");
      for (let i = extraClosing.length - 1; i >= 0; i--) {
        const pos = extraClosing[i];
        this.fixes.push(`Removed extra closing '${chars[pos]}'`);
        chars[pos] = "";
        changed = true;
      }
      result = chars.join("");
    }

    return { result, changed };
  }

  /**
   * More aggressive fixing for really broken JSON
   */
  private aggressiveFix(str: string): string {
    let result = str.trim();
    let fixed = false;

    if (
      !result.startsWith("{") &&
      !result.startsWith("[") &&
      result.includes(":")
    ) {
      result = "{" + result + "}";
      this.fixes.push("Wrapped content in braces");
    }

    if (
      !result.startsWith("{") &&
      !result.startsWith("[") &&
      result.includes(",")
    ) {
      result = "[" + result + "]";
      this.fixes.push("Wrapped content in brackets");
    }

    const beforeKeys = result;
    result = result.replace(
      /([{,\n]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );
    if (result !== beforeKeys) {
      this.fixes.push("Added quotes to unquoted keys");
      fixed = true;
    }

    result = result.replace(
      /:\s*([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+)(?=\s*[\n,}])/g,
      (match, value) => {
        fixed = true;
        return ': "' + value + '"';
      },
    );

    result = result.replace(
      /:\s*([A-Z][a-zA-Z]+)(?=\s*[\n,}])/g,
      (match, value) => {
        if (value !== "true" && value !== "false" && value !== "null") {
          fixed = true;
          return ': "' + value + '"';
        }
        return match;
      },
    );

    result = result.replace(/'([^']*)'(\s+)'/g, (match, item, space) => {
      fixed = true;
      return "'" + item + "'," + space + "'";
    });

    result = result.replace(/"([^"]*)"(\s+)"/g, (match, item, space) => {
      fixed = true;
      return '"' + item + '",' + space + '"';
    });

    if (fixed && !this.fixes.includes("Applied aggressive fixes")) {
      this.fixes.push("Applied aggressive fixes");
    }

    return result;
  }

  /**
   * Recursively sort object keys
   */
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    } else if (obj !== null && typeof obj === "object") {
      const sorted: any = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
        });
      return sorted;
    }
    return obj;
  }
}

export default JSONFixer;
