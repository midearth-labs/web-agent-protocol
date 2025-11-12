/**
 * Tool executor for API calls and render tool
 */

import { ApiClient } from "../api-client/api-client.js";
import type { FunctionCall, RenderFunctionCall, FunctionResponse } from "./types.js";
import { executeRenderTool, type RenderGeminiClient } from "./render-executor.js";
import type { ListTodosQuery } from "../models/api-model.js";

/**
 * Execute site API calls using ApiClient
 */
export async function executeSiteAPI(
  functionCall: FunctionCall,
  apiClient: ApiClient
): Promise<FunctionResponse> {
  const { name, args } = functionCall;

  try {
    let result: unknown;

    // Map tool names to ApiClient methods and translate arguments
    switch (name) {
      case "createTodo": {
        // Body: title, description, dueDate, priority
        result = await apiClient.createTodo({
          body: {
            title: args["title"] as string,
            description: (args["description"] as string),
            dueDate: (args["dueDate"] as string),
            priority: (args["priority"] as "low" | "medium" | "high" | "urgent"),
          },
        });
        break;
      }

      case "listTodos": {
        // Query: status, priority, dueDateBefore, dueDateAfter, title, description
        const query: ListTodosQuery = {};
        if (args["status"]) query["status"] = args["status"] as string;
        if (args["priority"]) query["priority"] = args["priority"] as string;
        if (args["dueDateBefore"]) query["dueDateBefore"] = args["dueDateBefore"] as string;
        if (args["dueDateAfter"]) query["dueDateAfter"] = args["dueDateAfter"] as string;
        if (args["title"]) query["title"] = args["title"] as string;
        if (args["description"]) query["description"] = args["description"] as string;

        result = await apiClient.listTodos({
          query: query as ListTodosQuery,
        });
        break;
      }

      case "getTodoById": {
        // Params: id
        result = await apiClient.getTodoById({
          params: {
            id: args["id"] as string,
          },
        });
        break;
      }

      case "updateTodo": {
        // Params: id, Body: title, description, dueDate, priority, status
        result = await apiClient.updateTodo({
          params: {
            id: args["id"] as string,
          },
          body: {
            ...(args["title"] !== undefined && { title: args["title"] as string }),
            ...(args["description"] !== undefined && { description: args["description"] as string | null }),
            ...(args["dueDate"] !== undefined && { dueDate: args["dueDate"] as string | null }),
            ...(args["priority"] !== undefined && { priority: args["priority"] as "low" | "medium" | "high" | "urgent" }),
            ...(args["status"] !== undefined && { status: args["status"] as "initial" | "complete" }),
          },
        });
        break;
      }

      case "deleteTodo": {
        // Params: id
        result = await apiClient.deleteTodo({
          params: {
            id: args["id"] as string,
          },
        });
        break;
      }

      case "bulkUpdateStatus": {
        // Body: ids, status
        result = await apiClient.bulkUpdateStatus({
          body: {
            ids: args["ids"] as string[],
            status: args["status"] as "initial" | "complete",
          },
        });
        break;
      }

      case "bulkDelete": {
        // Body: ids
        result = await apiClient.bulkDelete({
          body: {
            ids: args["ids"] as string[],
          },
        });
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      name,
      response: result,
    };
  } catch (error) {
    // Return error in function response format
    return {
      name,
      response: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Execute render tool (delegates to render executor)
 */
export async function executeRender(
  functionCall: RenderFunctionCall,
  geminiClient: RenderGeminiClient
): Promise<FunctionResponse> {
  const renderCode = await executeRenderTool(functionCall.args, geminiClient);
  return {
    name: "render",
    response: renderCode,
  };
}


