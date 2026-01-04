/**
 * Advanced JSON Array Filter Engine
 * Supports filtering arrays by keys, key-value pairs, multiple conditions, and more
 */

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterOrEqual"
  | "lessOrEqual"
  | "exists"
  | "notExists";

export type FilterType = "key" | "keyValue" | "multipleKeys" | "advanced";

export type FilterLogic = "AND" | "OR";

export interface FilterCondition {
  id: string;
  type: FilterType;
  key?: string;
  value?: any;
  operator?: FilterOperator;
  invert?: boolean;
  keys?: string[]; // For multiple keys filter
}

export interface SortConfig {
  field?: string; // Field path (supports dot notation)
  direction?: "asc" | "desc";
}

export interface PickConfig {
  fields?: string[]; // Field paths to include (supports dot notation)
}

export interface FilterQuery {
  conditions: FilterCondition[];
  logic: FilterLogic;
  sort?: SortConfig;
  pick?: PickConfig;
}

export interface FilterResult {
  filtered: any[];
  totalCount: number;
  matchedCount: number;
  unmatchedCount: number;
}

/**
 * Get nested value from object using dot notation path (e.g., "address.city")
 */
function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Get all unique keys from an array of objects (including nested keys with dot notation)
 */
export function getAllKeysFromArray(
  array: any[],
  includeNested: boolean = true,
  prefix: string = "",
): string[] {
  const keysSet = new Set<string>();
  array.forEach((obj) => {
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keysSet.add(fullKey);
        
        // Recursively get nested keys
        if (includeNested) {
          const value = obj[key];
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            const nestedKeys = getAllKeysFromArray([value], true, fullKey);
            nestedKeys.forEach((nestedKey) => keysSet.add(nestedKey));
          }
        }
      });
    }
  });
  return Array.from(keysSet).sort();
}

/**
 * Get statistics about keys in the array (including nested keys)
 */
export function getKeyStatistics(
  array: any[],
  includeNested: boolean = true,
  prefix: string = "",
): Record<string, number> {
  const stats: Record<string, number> = {};
  array.forEach((obj) => {
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        stats[fullKey] = (stats[fullKey] || 0) + 1;

        // Recursively get nested key statistics
        if (includeNested) {
          const value = obj[key];
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            const nestedStats = getKeyStatistics([value], true, fullKey);
            Object.keys(nestedStats).forEach((nestedKey) => {
              stats[nestedKey] = (stats[nestedKey] || 0) + nestedStats[nestedKey];
            });
          }
        }
      });
    }
  });
  return stats;
}

/**
 * Check if an object matches a single condition
 */
function matchesCondition(obj: any, condition: FilterCondition): boolean {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return false;
  }

  let result = false;

  switch (condition.type) {
    case "key":
      // Filter by key existence (supports nested paths)
      if (condition.key) {
        const value = getNestedValue(obj, condition.key);
        result = value !== undefined;
      }
      break;

    case "keyValue":
      // Filter by key-value pair (supports nested paths)
      if (condition.key && condition.operator) {
        // For operators that require a value, check if value is provided
        if (
          condition.operator !== "exists" &&
          condition.operator !== "notExists" &&
          (condition.value === undefined ||
            condition.value === null ||
            condition.value === "")
        ) {
          // Empty value for operators that need it - skip this condition
          return false;
        }
        const objValue = getNestedValue(obj, condition.key);
        result = evaluateOperator(
          objValue,
          condition.value,
          condition.operator,
        );
      }
      break;

    case "multipleKeys":
      // Filter by multiple keys (all must exist, supports nested paths)
      if (condition.keys && condition.keys.length > 0) {
        result = condition.keys.every((key) => {
          const value = getNestedValue(obj, key);
          return value !== undefined;
        });
      }
      break;

    case "advanced":
      // For advanced queries, we'll handle them recursively
      // This is a placeholder for future expansion
      result = true;
      break;
  }

  // Apply invert if needed
  return condition.invert ? !result : result;
}

/**
 * Evaluate operator comparison
 */
function evaluateOperator(
  objValue: any,
  filterValue: any,
  operator: FilterOperator,
): boolean {
  // Handle null/undefined
  if (objValue === null || objValue === undefined) {
    if (operator === "exists") return false;
    if (operator === "notExists") return true;
    return false;
  }

  // Handle exists/notExists operators
  if (operator === "exists") return true;
  if (operator === "notExists") return false;

  // Convert values for comparison
  const objStr = String(objValue).toLowerCase();
  const filterStr = String(filterValue || "").toLowerCase();

  // If filter value is empty for operators that need a value, return false (invalid filter)
  if (filterStr === "") {
    return false;
  }

  switch (operator) {
    case "equals":
      return objValue === filterValue || objStr === filterStr;

    case "notEquals":
      return objValue !== filterValue && objStr !== filterStr;

    case "contains":
      return objStr.includes(filterStr);

    case "notContains":
      return !objStr.includes(filterStr);

    case "startsWith":
      return objStr.startsWith(filterStr);

    case "endsWith":
      return objStr.endsWith(filterStr);

    case "greaterThan":
      return Number(objValue) > Number(filterValue);

    case "lessThan":
      return Number(objValue) < Number(filterValue);

    case "greaterOrEqual":
      return Number(objValue) >= Number(filterValue);

    case "lessOrEqual":
      return Number(objValue) <= Number(filterValue);

    default:
      return false;
  }
}

/**
 * Sort array by field (supports nested paths)
 */
function sortArray(array: any[], sortConfig: SortConfig): any[] {
  if (!sortConfig.field || !sortConfig.direction) return array;

  return [...array].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.field!);
    const bValue = getNestedValue(b, sortConfig.field!);

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return sortConfig.direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Pick specific fields from objects (supports nested paths)
 */
function pickFields(array: any[], pickConfig: PickConfig): any[] {
  if (!pickConfig.fields || pickConfig.fields.length === 0) return array;

  return array.map((obj) => {
    const picked: any = {};
    pickConfig.fields!.forEach((fieldPath) => {
      const value = getNestedValue(obj, fieldPath);
      if (value !== undefined) {
        // Handle nested paths - create nested structure
        const parts = fieldPath.split(".");
        let current = picked;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      }
    });
    return picked;
  });
}

/**
 * Filter an array based on filter query
 */
export function filterArray(
  array: any[],
  query: FilterQuery,
): FilterResult {
  if (!Array.isArray(array)) {
    return {
      filtered: [],
      totalCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    };
  }

  const totalCount = array.length;

  // Step 1: Filter
  let filtered = array;
  if (query.conditions.length > 0) {
    filtered = array.filter((obj) => {
      if (query.logic === "AND") {
        // All conditions must match
        return query.conditions.every((condition) =>
          matchesCondition(obj, condition),
        );
      } else {
        // OR: At least one condition must match
        return query.conditions.some((condition) =>
          matchesCondition(obj, condition),
        );
      }
    });
  }

  // Step 2: Sort
  if (query.sort && query.sort.field && query.sort.direction) {
    filtered = sortArray(filtered, query.sort);
  }

  // Step 3: Pick fields
  if (query.pick && query.pick.fields && query.pick.fields.length > 0) {
    filtered = pickFields(filtered, query.pick);
  }

  const matchedCount = filtered.length;
  const unmatchedCount = totalCount - matchedCount;

  return {
    filtered,
    totalCount,
    matchedCount,
    unmatchedCount,
  };
}

/**
 * Check if content is a JSON array
 */
export function isJsonArray(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * Get array from content (if it's an array)
 */
export function getArrayFromContent(content: string): any[] | null {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

