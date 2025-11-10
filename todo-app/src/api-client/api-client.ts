/**
 * API Client for Todo Management Application
 * Provides type-safe methods for interacting with the Todo API
 */

import type {
  CreateTodoRequest,
  UpdateTodoRequest,
  BulkUpdateStatusRequest,
  BulkDeleteRequest,
  ListTodosQuery,
  TodoIdParam,
  TodoResponse,
  TodoListResponse,
} from "../models/api-model.js";

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  baseUrl?: string;
}

/**
 * Request options for API calls
 */
interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
}

/**
 * API Client for Todo Management
 */
export class ApiClient {
  private readonly baseUrl: string;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:3000/api/v1/";
  }

  /**
   * Shared method for making HTTP requests
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, params, query, body } = options;

    // Replace path parameters
    let urlPath = path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        urlPath = urlPath.replace(`:${key}`, value);
      }
    }

    // Add query parameters
    const url = new URL(urlPath, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.append(key, value);
      }
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Add body for POST, PATCH requests
    if (body !== undefined && (method === "POST" || method === "PATCH")) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(url.toString(), fetchOptions);

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    const data = (await response.json()) as unknown;

    // Check for errors
    if (!response.ok) {
      const errorMessage =
        (typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "object" &&
          data.error !== null &&
          "message" in data.error &&
          typeof data.error.message === "string"
          ? data.error.message
          : null) || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  /**
   * Creates a new todo
   * Corresponds to: POST /api/v1/todos
   */
  async createTodo({
    body,
  }: {
    params?: never;
    query?: never;
    body: CreateTodoRequest;
  }): Promise<TodoResponse> {
    return this.request<TodoResponse>({
      method: "POST",
      path: "todos",
      body,
    });
  }

  /**
   * Lists todos with optional filtering
   * Corresponds to: GET /api/v1/todos
   */
  async listTodos({
    query,
  }: {
    params?: never;
    query?: ListTodosQuery;
    body?: never;
  }): Promise<TodoListResponse> {
    // Convert ListTodosQuery to URL search params format
    const queryParams: Record<string, string> = {};
    if (query) {
      if (query["status"]) queryParams["status"] = query["status"];
      if (query["priority"]) queryParams["priority"] = query["priority"];
      if (query["dueDate"]) queryParams["dueDate"] = query["dueDate"];
      if (query["title"]) queryParams["title"] = query["title"];
      if (query["description"]) queryParams["description"] = query["description"];
    }

    const requestOptions: RequestOptions = {
      method: "GET",
      path: "todos",
    };
    if (Object.keys(queryParams).length > 0) {
      requestOptions.query = queryParams;
    }

    return this.request<TodoListResponse>(requestOptions);
  }

  /**
   * Gets a todo by ID
   * Corresponds to: GET /api/v1/todos/:id
   */
  async getTodoById({
    params,
  }: {
    params: TodoIdParam;
    query?: never;
    body?: never;
  }): Promise<TodoResponse> {
    return this.request<TodoResponse>({
      method: "GET",
      path: "todos/:id",
      params: { id: params.id },
    });
  }

  /**
   * Updates a todo (partial update)
   * Corresponds to: PATCH /api/v1/todos/:id
   */
  async updateTodo({
    params,
    body,
  }: {
    params: TodoIdParam;
    query?: never;
    body: UpdateTodoRequest;
  }): Promise<TodoResponse> {
    return this.request<TodoResponse>({
      method: "PATCH",
      path: "todos/:id",
      params: { id: params.id },
      body,
    });
  }

  /**
   * Deletes a todo
   * Corresponds to: DELETE /api/v1/todos/:id
   */
  async deleteTodo({
    params,
  }: {
    params: TodoIdParam;
    query?: never;
    body?: never;
  }): Promise<void> {
    return this.request<void>({
      method: "DELETE",
      path: "todos/:id",
      params: { id: params.id },
    });
  }

  /**
   * Bulk update status for multiple todos
   * Corresponds to: POST /api/v1/todos/bulk-update-status
   */
  async bulkUpdateStatus({
    body,
  }: {
    params?: never;
    query?: never;
    body: BulkUpdateStatusRequest;
  }): Promise<TodoListResponse> {
    return this.request<TodoListResponse>({
      method: "POST",
      path: "todos/bulk-update-status",
      body,
    });
  }

  /**
   * Bulk delete multiple todos
   * Corresponds to: POST /api/v1/todos/bulk-delete
   */
  async bulkDelete({
    body,
  }: {
    params?: never;
    query?: never;
    body: BulkDeleteRequest;
  }): Promise<void> {
    return this.request<void>({
      method: "POST",
      path: "todos/bulk-delete",
      body,
    });
  }
}

