import type { ParseError } from "jsonc-parser";
import { FileFormat } from "../../enums/file.enum";
import JSONFixer from "./jsonFixer";
import { jsonrepair } from "jsonrepair";

/**
 * Parse JSON with jsonrepair fallback (like jsonEditorOnline)
 * Tries JSON.parse first, then falls back to jsonrepair if it fails
 */
export function parseAndRepair(jsonText: string): any {
  try {
    return JSON.parse(jsonText);
  } catch {
    // If parsing fails, try jsonrepair (like jsonEditorOnline)
    return JSON.parse(jsonrepair(jsonText));
  }
}

export const contentToJson = (
  value: string,
  format = FileFormat.JSON,
  autoFix = true,
): Promise<object> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!value) return resolve({});

      if (format === FileFormat.JSON) {
        const { parse } = await import("jsonc-parser");
        const errors: ParseError[] = [];
        const result = parse(value, errors);
        if (errors.length === 0) {
          return resolve(result);
        }

        // If parsing failed and autoFix is enabled, try to fix the JSON
        if (autoFix) {
          try {
            const fixer = new JSONFixer();
            const fixed = fixer.fix(value);
            if (fixed.success) {
              const parsed = JSON.parse(fixed.output);
              return resolve(parsed);
            }
          } catch (fixError) {
            // If fixing failed, try regular JSON.parse as fallback
            try {
              return resolve(JSON.parse(value));
            } catch (e) {
              return reject(
                new Error(
                  `Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
                ),
              );
            }
          }
        }

        // Fallback to regular JSON.parse
        try {
          return resolve(JSON.parse(value));
        } catch (e) {
          return reject(
            new Error(
              `Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
            ),
          );
        }
      }

      if (format === FileFormat.YAML) {
        const { load } = await import("js-yaml");
        return resolve(load(value) as object);
      }

      if (format === FileFormat.XML) {
        const { XMLParser } = await import("fast-xml-parser");
        const parser = new XMLParser({
          attributeNamePrefix: "$",
          ignoreAttributes: false,
          allowBooleanAttributes: true,
          parseAttributeValue: true,
          trimValues: true,
          parseTagValue: true,
        });
        return resolve(parser.parse(value));
      }

      if (format === FileFormat.CSV) {
        const { csv2json } = await import("json-2-csv");
        const result = csv2json(value, {
          trimFieldValues: true,
          trimHeaderFields: true,
          wrapBooleans: true,
          excelBOM: true,
        });
        return resolve(result);
      }

      return resolve({});
    } catch (error) {
      // If autoFix is enabled and format is JSON, try to fix it
      if (format === FileFormat.JSON && autoFix) {
        try {
          const fixer = new JSONFixer();
          const fixed = fixer.fix(value);
          if (fixed.success) {
            const parsed = JSON.parse(fixed.output);
            return resolve(parsed);
          }
        } catch (fixError) {
          // If fixing also failed, reject with original error
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to parse content";
      return reject(errorMessage);
    }
  });
};

export const jsonToContent = async (
  json: string,
  format: FileFormat,
): Promise<string> => {
  return new Promise(async (resolve) => {
    try {
      if (!json) return resolve("");

      if (format === FileFormat.JSON) {
        const parsedJson = JSON.parse(json);
        return resolve(JSON.stringify(parsedJson, null, 2));
      }

      if (format === FileFormat.YAML) {
        const { dump } = await import("js-yaml");
        const { parse } = await import("jsonc-parser");
        return resolve(dump(parse(json)));
      }

      if (format === FileFormat.XML) {
        const { XMLBuilder } = await import("fast-xml-parser");
        const builder = new XMLBuilder({
          format: true,
          attributeNamePrefix: "$",
          ignoreAttributes: false,
        });

        return resolve(builder.build(JSON.parse(json)));
      }

      if (format === FileFormat.CSV) {
        const { json2csv } = await import("json-2-csv");
        const parsedJson = JSON.parse(json);

        const data = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
        return resolve(
          json2csv(data, {
            expandArrayObjects: true,
            expandNestedObjects: true,
            excelBOM: true,
            wrapBooleans: true,
            trimFieldValues: true,
            trimHeaderFields: true,
          }),
        );
      }

      return resolve(json);
    } catch (error) {
      console.error(json, error);
      return resolve(json);
    }
  });
};
