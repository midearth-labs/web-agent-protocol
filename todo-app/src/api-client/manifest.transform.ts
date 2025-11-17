import type { WAPManifest, WAPToolDeclaration, WAPSchema, UserJourney } from "./manifest.type.js";
import { WAPSchemaType } from "./manifest.type.js";
import type { Schema as GeminiSchema, FunctionDeclaration as GeminiFunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";

// Provider-agnostic bundles
export type FewShotExample = {
  user: string;
  assistant: string;
};

export type GeminiToolsBundle = {
  tools: GeminiFunctionDeclaration[];
  examples: FewShotExample[];
};

/**
 * Claude tool definition (JSON Schema format)
 */
export type ClaudeTool = {
  name: string;
  strict: boolean;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
};

export type ClaudeToolsBundle = {
  tools: ClaudeTool[];
  examples: FewShotExample[];
};

export type ProviderBundle = GeminiToolsBundle | ClaudeToolsBundle;

// Public API
export function manifestToGemini(manifest: WAPManifest): GeminiToolsBundle {
  const functionDeclarations: GeminiFunctionDeclaration[] = [
    ...manifest.tools.map(toolToGemini),
    // Inject render meta-tool for orchestration UIs
    RENDER_TOOL_FOR_GEMINI
  ];
  return {
    tools: functionDeclarations,
    examples: buildFewShots(manifest)
  };
}

export function toProviderTools(manifest: WAPManifest): ProviderBundle {
  return manifestToGemini(manifest);
}

/**
 * Transform WAP manifest to Claude tools format
 */
export function manifestToClaudeTools(manifest: WAPManifest): ClaudeToolsBundle {
  const tools: ClaudeTool[] = [
    ...manifest.tools.map(toolToClaude),
    // Inject render meta-tool for orchestration UIs
    RENDER_TOOL_FOR_CLAUDE
  ];
  return {
    tools,
    examples: buildFewShots(manifest)
  };
}

// Few-shot examples
export function buildFewShots(manifest: WAPManifest): FewShotExample[] {
  return manifest.userJourneys.map(j => userJourneyToFewShot(j));
}

function userJourneyToFewShot(journey: UserJourney): FewShotExample {
  const referenced = (journey.referencedTools || []).join(", ");
  const thinking = compactText(
    [
      `Scenario: ${journey.scenario}`,
      `Tools: ${referenced}`,
      `Approach: ${journey.approach}`,
      `Pseudo-code: ${journey.pseudoCode}`
    ]
      .filter(Boolean)
      .join("\n")
  );
  const assistant = `<think>${thinking}</think>`;
  return {
    user: journey.request,
    assistant
  };
}

// Tool mappers
function toolToGemini(tool: WAPToolDeclaration): GeminiFunctionDeclaration {
  // Build description with tags
  const tagsJson = JSON.stringify(tool.tags);
  const descriptionWithTags = `${tool.description}\n@tags: ${tagsJson}`;
  
  return {
    name: tool.name,
    description: descriptionWithTags,
    parameters: wapSchemaToGeminiSchema(tool.parameters),
    ...(tool.response ? { response: wapSchemaToGeminiSchema(tool.response) } : {}),
  };
}

// JSON Schema mappers
function wapSchemaToGeminiSchema(wapSchema: WAPSchema): GeminiSchema {
    const { examples, anyOf, type, items, properties, ...rest } = wapSchema;
  const schema: GeminiSchema = { 
    ...rest,
    ...(type ? { type: WAP_SCHEMA_TYPE_TO_GEMINI_TYPE_MAP[type] } : {}),
    ...(items ? { items: wapSchemaToGeminiSchema(items) } : {}),
    ...(properties ? { properties: Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, wapSchemaToGeminiSchema(value)])) } : {}),
    ...(anyOf ? { anyOf: anyOf.map(s => wapSchemaToGeminiSchema(s)) } : {}),
    ...(examples ? { example: examples[0] } : {}),
   };

   return schema;
}

const WAP_SCHEMA_TYPE_TO_GEMINI_TYPE_MAP: Record<WAPSchemaType, Type> = {
  [WAPSchemaType.STRING]: Type.STRING,
  [WAPSchemaType.NUMBER]: Type.NUMBER,
  [WAPSchemaType.INTEGER]: Type.INTEGER,
  [WAPSchemaType.BOOLEAN]: Type.BOOLEAN,
  [WAPSchemaType.ARRAY]: Type.ARRAY,
  [WAPSchemaType.OBJECT]: Type.OBJECT,
  [WAPSchemaType.NULL]: Type.NULL,
  [WAPSchemaType.TYPE_UNSPECIFIED]: Type.TYPE_UNSPECIFIED,
};

// Render tool (Gemini only)
const RENDER_TOOL_FOR_GEMINI: GeminiFunctionDeclaration = {
  name: "render",
  description:
    "Generate dynamic UI render function for displaying substep results. Returns JavaScript code for function render(data, onAction). You must pass both the data structures (type definitions) and the actual data to render.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dataStructure: {
          type: Type.STRING,
          description:
            "TypeScript type definitions as a string. Includes inline descriptive comments for each property, even inner properties."
        },
        data: {
          type: Type.STRING,
          description:
            "The JSON string of the actual data to render. Structure must align with the typescript structure defined in dataStructure. This is the data that will be passed to the generated render function."
        },
        mainGoal: { type: Type.STRING, description: "The user's original natural language request" },
        subGoal: { type: Type.STRING, description: "What this specific substep is trying to achieve" },
        stepType: {
          type: Type.STRING,
          description: "Type of UI to generate",
          format: "enum",
          enum: ["preview", "confirm", "progress", "result", "error"]
        },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              variant: { type: Type.STRING, enum: ["primary", "danger", "secondary", "success"], format: "enum" },
              continues: { type: Type.BOOLEAN }
            },
            required: ["id", "label", "continues"]
          }
        },
        taskCompleted: {
          type: Type.BOOLEAN,
          description: "If true, signals that the task is complete and the conversation should end. Set to true for the final render call when all work is done."
        },
        metadata: {
          type: Type.OBJECT,
          properties: {
            affectedCount: { type: Type.NUMBER },
            operationType: { type: Type.STRING },
            isDestructive: { type: Type.BOOLEAN }
          }
        }
      },
      required: ["dataStructure", "data", "mainGoal", "subGoal", "stepType", "actions"]
    },
    response: {
      type: Type.OBJECT,
      description: "Structured user action response when user interacts with the rendered UI",
      properties: {
        type: {
          type: Type.STRING,
          description: "Response type identifier",
          enum: ["userAction"]
        },
        actionId: {
          type: Type.STRING,
          description: "The ID of the action that the user triggered from the rendered UI"
        },
        payload: {
          type: Type.OBJECT,
          description: "Optional payload data associated with the user action. Contains any additional data the user provided when triggering the action."
        }
      },
      required: ["type", "actionId"]
    }
  };

// Claude tool mappers
function toolToClaude(tool: WAPToolDeclaration): ClaudeTool {
  // Build description with tags
  const tagsJson = JSON.stringify(tool.tags);
  const descriptionWithTags = `${tool.description}\n@tags: ${tagsJson}`;
  
  const inputSchema = wapSchemaToClaudeSchema(tool.parameters);
  
  return {
    name: tool.name,
    strict: true,
    description: descriptionWithTags,
    input_schema: inputSchema as ClaudeTool["input_schema"],
  };
}

// JSON Schema mappers for Claude (uses standard JSON Schema)
function wapSchemaToClaudeSchema(wapSchema: WAPSchema): Record<string, unknown> {
  const { examples, anyOf, type, items, properties, ...rest } = wapSchema;
  
  const schema: Record<string, unknown> = {
    ...rest,
  };

  // Map WAP schema type to JSON Schema type
  if (type) {
    const jsonSchemaType = WAP_SCHEMA_TYPE_TO_JSON_SCHEMA_TYPE[type];
    if (jsonSchemaType) {
      schema["type"] = jsonSchemaType;
    }
  }

  // Handle nested structures
  if (items) {
    schema["items"] = wapSchemaToClaudeSchema(items);
  }

  if (properties) {
    schema["properties"] = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        wapSchemaToClaudeSchema(value),
      ])
    );
  }

  if (anyOf) {
    schema["anyOf"] = anyOf.map((s) => wapSchemaToClaudeSchema(s));
  }

  // Handle examples (Claude doesn't use examples in schema, but we can add them as description)
  if (examples && examples.length > 0) {
    // Note: Claude doesn't support examples in input_schema, but we can add to description if needed
  }

  return schema;
}

const WAP_SCHEMA_TYPE_TO_JSON_SCHEMA_TYPE: Record<WAPSchemaType, string> = {
  [WAPSchemaType.STRING]: "string",
  [WAPSchemaType.NUMBER]: "number",
  [WAPSchemaType.INTEGER]: "integer",
  [WAPSchemaType.BOOLEAN]: "boolean",
  [WAPSchemaType.ARRAY]: "array",
  [WAPSchemaType.OBJECT]: "object",
  [WAPSchemaType.NULL]: "null",
  [WAPSchemaType.TYPE_UNSPECIFIED]: "object", // Default to object
};

// Render tool for Claude
const RENDER_TOOL_FOR_CLAUDE: ClaudeTool = {
  name: "render",
  strict: true,
  description:
    "Generate dynamic UI render function for displaying substep results. Returns JavaScript code for function render(data, onAction). You must pass both the data structures (type definitions) and the actual data to render.",
  input_schema: {
    type: "object",
    properties: {
      dataStructure: {
        type: "string",
        description:
          "TypeScript type definitions as a string. Includes inline descriptive comments for each property, even inner properties.",
      },
      data: {
        type: "string",
        description:
          "The JSON string of the actual data to render. Structure must align with the typescript structure defined in dataStructure. This is the data that will be passed to the generated render function.",
      },
      mainGoal: {
        type: "string",
        description: "The user's original natural language request",
      },
      subGoal: {
        type: "string",
        description: "What this specific substep is trying to achieve",
      },
      stepType: {
        type: "string",
        description: "Type of UI to generate",
        enum: ["preview", "confirm", "progress", "result", "error"],
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            variant: {
              type: "string",
              enum: ["primary", "danger", "secondary", "success"],
            },
            continues: { type: "boolean" },
          },
          required: ["id", "label", "continues"],
        },
      },
      taskCompleted: {
        type: "boolean",
        description:
          "If true, signals that the task is complete and the conversation should end. Set to true for the final render call when all work is done.",
      },
      metadata: {
        type: "object",
        properties: {
          affectedCount: { type: "number" },
          operationType: { type: "string" },
          isDestructive: { type: "boolean" },
        },
      },
    },
    required: ["dataStructure", "data", "mainGoal", "subGoal", "stepType", "actions"],
  },
};

// Utilities
function compactText(text: string): string {
  return text
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .join("\n");
}


