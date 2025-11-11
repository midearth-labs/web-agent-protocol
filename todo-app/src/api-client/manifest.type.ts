


/** The type of the data. */
export enum WAPSchemaType {
  /**
   * Not specified, should not be used.
   */
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  /**
   * OpenAPI string type
   */
  STRING = "STRING",
  /**
   * OpenAPI number type
   */
  NUMBER = "NUMBER",
  /**
   * OpenAPI integer type
   */
  INTEGER = "INTEGER",
  /**
   * OpenAPI boolean type
   */
  BOOLEAN = "BOOLEAN",
  /**
   * OpenAPI array type
   */
  ARRAY = "ARRAY",
  /**
   * OpenAPI object type
   */
  OBJECT = "OBJECT",
  /**
   * Null type
   */
  NULL = "NULL"
}

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

export enum FunctionTags {
  MUTATING = "mutating",
  READONLY = "readonly",
  FILTERABLE = "filterable",
  BATCH = "batch",
  SEARCH = "search",
  CREATE = "create",
  READ = "read",
  LIST = "list",
  UPDATE = "update",
  DELETE = "delete",
  SORTABLE = "sortable",
  PATCH = "patch",
  IDEMPOTENT = "idempotent",
  ASYNC = "async",
  PAGINATED = "paginated",
  ASYNC_STATUS_CHECK = "async-status-check",
  COMPENSATING = "compensating",
  RATE_LIMITED = "rate-limited",
  NOT_RATE_LIMITED = "not-rate-limited",
  CACHED = "cached",
}

export type WAPToolDeclaration = {
  /** Optional. Description and purpose of the function. Model uses it to decide how and whether to call the function. */
  description: string; //TODO: tags will be concatenated with this.
  /** Optional. Description and purpose of the function. Model uses it to decide how and whether to call the function. */
  fullDescription: WAPToolDeclaration["description"], //TODO: Remove during transform
  /** Required. The name of the function to call. Must start with a letter or an underscore. Must be a-z, A-Z, 0-9, or contain underscores, dots and dashes, with a maximum length of 64. */
  name: string;
  /** Optional. Describes the parameters to this function in JSON Schema Object format. Reflects the Open API 3.03 Parameter Object. string Key: the name of the parameter. Parameter names are case sensitive. Schema Value: the Schema defining the type used for the parameter. For function with no parameters, this can be left unset. Parameter names must start with a letter or an underscore and must only contain chars a-z, A-Z, 0-9, or underscores with a maximum length of 64. Example with 1 required and 1 optional parameter: type: OBJECT properties: param1: type: STRING param2: type: INTEGER required: - param1 */
  parameters: WAPSchema;
  /** Optional. Describes the parameters to the function in JSON Schema format. The schema must describe an object where the properties are the parameters to the function. For example: ``` { "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "integer" } }, "additionalProperties": false, "required": ["name", "age"], "propertyOrdering": ["name", "age"] } ``` This field is mutually exclusive with `parameters`. */
  response?: WAPSchema;
  /** Tags for function categorization (e.g., ["mutating", "create"], ["readonly", "filterable"]) */
  tags: FunctionTags[], //TODO: Add to description during transform
}


export type WAPSchema = {
    /** Optional. The value should be validated against any (one or more) of the subschemas in the list. */
    anyOf?: WAPSchema[];
    /** Optional. Default value of the data. */
    default?: unknown;
    /** Optional. The description of the data. */
    description?: string;
    /** Optional. Possible values of the element of primitive type with enum format. Examples: 1. We can define direction as : {type:STRING, format:enum, enum:["EAST", NORTH", "SOUTH", "WEST"]} 2. We can define apartment number as : {type:INTEGER, format:enum, enum:["101", "201", "301"]} */
    enum?: string[];
    /** Optional. Example of the object. Will only populated when the object is the root. */
    examples?: unknown[]; //TODO: Transform to first example
    /** Optional. The format of the data. Supported formats: for NUMBER type: "float", "double" for INTEGER type: "int32", "int64" for STRING type: "email", "byte", etc */
    format?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE ARRAY Schema of the elements of Type.ARRAY. */
    items?: WAPSchema;
    /** Optional. Maximum number of the elements for Type.ARRAY. */
    maxItems?: string;
    /** Optional. Maximum length of the Type.STRING */
    maxLength?: string;
    /** Optional. Maximum number of the properties for Type.OBJECT. */
    maxProperties?: string;
    /** Optional. Maximum value of the Type.INTEGER and Type.NUMBER */
    maximum?: number;
    /** Optional. Minimum number of the elements for Type.ARRAY. */
    minItems?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE STRING Minimum length of the Type.STRING */
    minLength?: string;
    /** Optional. Minimum number of the properties for Type.OBJECT. */
    minProperties?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE INTEGER and NUMBER Minimum value of the Type.INTEGER and Type.NUMBER */
    minimum?: number;
    /** Optional. Indicates if the value may be null. */
    nullable?: boolean;
    /** Optional. Pattern of the Type.STRING to restrict a string to a regular expression. */
    pattern?: string;
    /** Optional. SCHEMA FIELDS FOR TYPE OBJECT Properties of Type.OBJECT. */
    properties?: Record<string, WAPSchema>;
    /** Optional. Required properties of Type.OBJECT. */
    required?: string[];
    /** Optional. The title of the Schema. */
    title?: string;
    /** Optional. The type of the data. */
    type?: WAPSchemaType;
}

/**
 * Complete manifest structure
 */
export type WAPManifest = {
  /** Array of all available API tools */
  tools: WAPToolDeclaration[];
  /** Array of all user journey examples */
  userJourneys: UserJourney[];
};

/**
 * Validation error class for WAPManifest validation
 */
export class WAPManifestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WAPManifestValidationError";
  }
}

/**
 * Valid formats for each schema type
 */
const VALID_FORMATS: Record<WAPSchemaType, string[]> = {
  [WAPSchemaType.TYPE_UNSPECIFIED]: [],
  [WAPSchemaType.STRING]: ["uuid", "date", "date-time", "email", "byte", "enum", "uri", "uri-reference"],
  [WAPSchemaType.NUMBER]: ["float", "double"],
  [WAPSchemaType.INTEGER]: ["int32", "int64"],
  [WAPSchemaType.BOOLEAN]: [],
  [WAPSchemaType.ARRAY]: [],
  [WAPSchemaType.OBJECT]: [],
  [WAPSchemaType.NULL]: [],
};

/**
 * Validates a WAPManifest and all its nested properties.
 * Throws WAPManifestValidationError on the first encountered error.
 * 
 * @param manifest - The WAPManifest to validate
 * @throws {WAPManifestValidationError} If validation fails
 */
export function validateWAPManifest(m: unknown): asserts m is WAPManifest {
  const manifest = m as WAPManifest;
  if (!manifest || typeof manifest !== "object") {
    throw new WAPManifestValidationError("Manifest must be an object");
  }

  // Validate top-level structure
  if (!Array.isArray(manifest.tools)) {
    throw new WAPManifestValidationError("Manifest.tools must be an array");
  }

  if (!Array.isArray(manifest.userJourneys)) {
    throw new WAPManifestValidationError("Manifest.userJourneys must be an array");
  }

  // Validate each tool
  manifest.tools.forEach((tool, index) => {
    validateTool(tool, index);
  });
  // Build map of tool names for fast lookup
  const toolNameMap = new Set<string>(manifest.tools.map(t => t.name));

  // Validate user journeys (basic structure check)
  manifest.userJourneys.forEach((journey, index) => {
    validateUserJourney(journey, index, toolNameMap);
  });
}

function validateUserJourney(j: unknown, index: number, toolNameMap: Set<string>): asserts j is UserJourney {
  const journey = j as UserJourney;
  if (!journey || typeof journey !== "object") {
    throw new WAPManifestValidationError(`UserJourney[${index}] must be an object`);
  }
  if (typeof journey["request"] !== "string") {
    throw new WAPManifestValidationError(`UserJourney[${index}].request must be a string`);
  }
  if (typeof journey["scenario"] !== "string") {
    throw new WAPManifestValidationError(`UserJourney[${index}].scenario must be a string`);
  }
  if (typeof journey["approach"] !== "string") {
    throw new WAPManifestValidationError(`UserJourney[${index}].approach must be a string`);
  }
  if (typeof journey["pseudoCode"] !== "string") {
    throw new WAPManifestValidationError(`UserJourney[${index}].pseudoCode must be a string`);
  }
  if (!Array.isArray(journey["referencedTools"])) {
    throw new WAPManifestValidationError(`UserJourney[${index}].referencedTools must be an array`);
  }
  journey["referencedTools"].forEach((refTool, ri) => {
    if (typeof refTool !== "string") {
      throw new WAPManifestValidationError(`UserJourney[${index}].referencedTools[${ri}] must be a string`);
    }
    if (!toolNameMap.has(refTool)) {
      throw new WAPManifestValidationError(`UserJourney[${index}].referencedTools[${ri}] ("${refTool}") is not a defined tool`);
    }
  });
}

/**
 * Validates a single tool declaration
 */
function validateTool(t: unknown, index: number): asserts t is WAPToolDeclaration {
  const tool = t as WAPToolDeclaration;
  if (!tool || typeof tool !== "object") {
    throw new WAPManifestValidationError(`Tool[${index}] must be an object`);
  }

  // Validate name (required)
  if (typeof tool.name !== "string" || tool.name.length === 0) {
    throw new WAPManifestValidationError(`Tool[${index}].name must be a non-empty string`);
  }

  // Validate name (required)
  if (typeof tool.description !== "string" || tool.description.length === 0) {
    throw new WAPManifestValidationError(`Tool[${index}].name must be a non-empty string`);
  }

  // Validate fullDescription (required)
  if (typeof tool.fullDescription !== "string") {
    throw new WAPManifestValidationError(`Tool[${index}].fullDescription must be a string`);
  }

  // Validate tags (required, must be array)
  if (!Array.isArray(tool.tags)) {
    throw new WAPManifestValidationError(`Tool[${index}].tags must be an array`);
  }

  // Validate parameters (always required)
  if (tool.parameters === undefined || tool.parameters === null) {
    throw new WAPManifestValidationError(`Tool[${index}].parameters must be defined`);
  }
  validateSchema(tool.parameters, `Tool[${index}].parameters`, true);

  // Validate response (required unless tags include "update" or "delete")
  const hasUpdateOrDelete = tool.tags.includes(FunctionTags.UPDATE) || tool.tags.includes(FunctionTags.DELETE);
  
  if (tool.response !== undefined && tool.response !== null) {
    // If tags include update/delete, response can be undefined, but if defined, it must be valid
    validateSchema(tool.response, `Tool[${index}].response`, true);
  } else if (!hasUpdateOrDelete) {
    throw new WAPManifestValidationError(
      `Tool[${index}].response must be defined (only allowed to be undefined when tags include "update" or "delete")`
    );
  } 
}

/**
 * Recursively validates a WAPSchema
 */
function validateSchema(s: unknown, path: string, isRootSchema: boolean = false): asserts s is WAPSchema {
  const schema = s as WAPSchema;
  if (!schema || typeof schema !== "object") {
    throw new WAPManifestValidationError(`${path} must be an object`);
  }

  // Type is always required
  if (schema.type === undefined || schema.type === null) {
    throw new WAPManifestValidationError(`${path}.type must be defined`);
  }

  if (typeof schema.type !== "string") {
    throw new WAPManifestValidationError(`${path}.type must be a string`);
  }

  // Validate type is a valid WAPSchemaType
  if (!Object.values(WAPSchemaType).includes(schema.type)) {
    throw new WAPManifestValidationError(
      `${path}.type must be one of: ${Object.values(WAPSchemaType).join(", ")}`
    );
  }

  // Validate format if present
  if (schema.format !== undefined && schema.format !== null) {
    if (typeof schema.format !== "string") {
      throw new WAPManifestValidationError(`${path}.format must be a string`);
    }
    const validFormats = VALID_FORMATS[schema.type];
    if (validFormats.length > 0 && !validFormats.includes(schema.format)) {
      throw new WAPManifestValidationError(
        `${path}.format "${schema.format}" is not valid for type "${schema.type}". Valid formats: ${validFormats.join(", ")}`
      );
    }
  }

  // Validate ARRAY type requires items
  if (schema.type === WAPSchemaType.ARRAY) {
    if (schema.items === undefined || schema.items === null) {
      throw new WAPManifestValidationError(`${path}.items must be defined when type is ARRAY`);
    }
    validateSchema(schema.items, `${path}.items`);
  }

  // Validate OBJECT type requires properties
  if (schema.type === WAPSchemaType.OBJECT) {
    const properties = schema.properties;
    if (properties === undefined || properties === null) {
      throw new WAPManifestValidationError(`${path}.properties must be defined when type is OBJECT`);
    }
    if (typeof properties !== "object" || Array.isArray(properties)) {
      throw new WAPManifestValidationError(`${path}.properties must be an object`);
    }

    // Validate each property recursively
    Object.entries(properties).forEach(([propName, propSchema]) => {
      validateSchema(propSchema, `${path}.properties.${propName}`);
    });

    // Validate required array if present
    if (schema.required !== undefined && schema.required !== null) {
      if (!Array.isArray(schema.required)) {
        throw new WAPManifestValidationError(`${path}.required must be an array`);
      }
      schema.required.forEach((requiredProp, i) => {
        if (typeof requiredProp !== "string") {
          throw new WAPManifestValidationError(`${path}.required[${i}] must be a string`);
        }
        if (!(requiredProp in properties)) {
          throw new WAPManifestValidationError(
            `${path}.required[${i}] references property "${requiredProp}" that does not exist in properties`
          );
        }
      });
    }
  }

  // Validate anyOf if present
  if (schema.anyOf !== undefined && schema.anyOf !== null) {
    if (!Array.isArray(schema.anyOf)) {
      throw new WAPManifestValidationError(`${path}.anyOf must be an array`);
    }
    schema.anyOf.forEach((anyOfSchema, i) => {
      validateSchema(anyOfSchema, `${path}.anyOf[${i}]`);
    });
  }

  // Validate enum if present (must be array of strings)
  if (schema.enum !== undefined && schema.enum !== null) {
    if (!Array.isArray(schema.enum)) {
      throw new WAPManifestValidationError(`${path}.enum must be an array`);
    }
    schema.enum.forEach((enumValue, index) => {
      if (typeof enumValue !== "string") {
        throw new WAPManifestValidationError(`${path}.enum[${index}] must be a string`);
      }
    });
  }

  // Validate examples if present (must be array)
  if (schema.examples !== undefined && schema.examples !== null) {
    if (!Array.isArray(schema.examples)) {
      throw new WAPManifestValidationError(`${path}.examples must be an array`);
    }
  } else if (isRootSchema) {
    throw new WAPManifestValidationError(`${path}.examples must be defined for root schema`);
  }

  // Validate numeric constraints
  if (schema.minItems !== undefined && schema.minItems !== null) {
    const minItemsValue = schema.minItems;
    // Ensure minItems string is a valid base10 non-negative integer
    if (typeof minItemsValue === "string" && !/^\d+$/.test(minItemsValue)) {
      throw new WAPManifestValidationError(`${path}.minItems ("${minItemsValue}") must be a base10 non-negative integer string`);
    }
  }

  if (schema.maxItems !== undefined && schema.maxItems !== null) {
    const maxItemsValue = schema.maxItems;
    // Ensure maxItems string is a valid base10 non-negative integer
    if (typeof maxItemsValue === "string" && !/^\d+$/.test(maxItemsValue)) {
      throw new WAPManifestValidationError(`${path}.maxItems ("${maxItemsValue}") must be a base10 non-negative integer string`);
    }
  }

  if (schema.minLength !== undefined && schema.minLength !== null) {
    const minLengthValue = schema.minLength;
    // Ensure minLength string is a valid base10 non-negative integer
    if (typeof minLengthValue === "string" && !/^\d+$/.test(minLengthValue)) {
      throw new WAPManifestValidationError(`${path}.minLength ("${minLengthValue}") must be a base10 non-negative integer string`);
    }
  }

  if (schema.maxLength !== undefined && schema.maxLength !== null) {
    const maxLengthValue = schema.maxLength;
    // Ensure maxLength string is a valid base10 non-negative integer
    if (typeof maxLengthValue === "string" && !/^\d+$/.test(maxLengthValue)) {
      throw new WAPManifestValidationError(`${path}.maxLength ("${maxLengthValue}") must be a base10 non-negative integer string`);
    }
  }

  if (schema.minimum !== undefined && schema.minimum !== null) {
    const minimumValue = schema.minimum;
    // Ensure minimum is a valid number
    if (typeof minimumValue !== "number") {
      throw new WAPManifestValidationError(`${path}.minimum must be a number`);
    }
  }

  if (schema.maximum !== undefined && schema.maximum !== null) {
    const maximumValue = schema.maximum;
    // Ensure maximum is a valid number
    if (typeof maximumValue !== "number") {
      throw new WAPManifestValidationError(`${path}.maximum must be a number`);
    }
  }

  // Validate nullable if present
  if (schema.nullable !== undefined && schema.nullable !== null) {
    if (typeof schema.nullable !== "boolean") {
      throw new WAPManifestValidationError(`${path}.nullable must be a boolean`);
    }
  }
}

