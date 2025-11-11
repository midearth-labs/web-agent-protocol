/**
 * TypeScript type definitions for the Web Agent Protocol Manifest
 * 
 * This file defines the structure for representing API client interfaces
 * as structured manifest data that can be consumed by agents.
 */

/**
 * Data type definition for a single property
 * 
 * Supports:
 * - Primitive types: string, number, boolean
 * - Arrays of primitives: use dataType: ["array"] + itemType
 * - Arrays of objects: use dataType: ["array"] + nestedProperties
 * - Nested objects: use dataType: ["object"] + nestedProperties
 * - Nullable types: use nullable: true (do NOT include "null" in dataType)
 */
export type DataTypeDefinition = {
  /** Array of data types, e.g., ["string"], ["array"], ["object"] */
  dataType: string[];
  /** Whether this property is optional */
  optional: boolean;
  /** Whether this property can be null (do NOT include "null" in dataType) */
  nullable: boolean;
  /** Human-readable description of the property */
  description: string;
  /** Example values for this property */
  examples: (string | number | boolean | null | unknown[] | Record<string, unknown>)[];
  /** For arrays of primitives: the type of array items (e.g., "string", "number") */
  itemType?: string;
  /** For arrays of objects or nested objects: recursive structure for nested types */
  nestedProperties?: InputOutputType;
};

/**
 * Input or output type structure
 * Maps property names to their type definitions
 */
export type InputOutputType = {
  [propertyName: string]: DataTypeDefinition;
};

/**
 * Tool definition representing an API method
 */
export type Tool = {
  /** Method name (e.g., "createTodo", "listTodos") */
  name: string;
  /** Description with short and full versions */
  description: {
    /** Short one-line description */
    short: string;
    /** Full detailed description including HTTP method, endpoint, behavior, errors */
    full: string;
  };
  /** Input type structure (flattened request parameters) */
  inputType: InputOutputType;
  /** Output type structure (flattened response) */
  outputType: InputOutputType;
  /** Tags for categorization (e.g., ["mutating", "create"], ["readonly", "filterable"]) */
  tags: string[];
  /** Full example input objects */
  inputExamples: unknown[];
  /** Full example output objects */
  outputExamples: unknown[];
};

/**
 * User journey definition representing a complete workflow
 */
export type UserJourney = {
  /** User's request in natural language */
  request: string;
  /** Scenario description */
  scenario: string;
  /** Approach description (step-by-step) */
  approach: string;
  /** Pseudo code showing the implementation */
  pseudoCode: string;
  /** Array of tool names referenced in this journey */
  referencedTools: string[];
};

/**
 * Complete manifest structure
 */
export type Manifest = {
  /** Array of all available API tools */
  tools: Tool[];
  /** Array of all user journey examples */
  userJourneys: UserJourney[];
};

