/**
 * E2E Test Suite for ApiClient
 * Tests all API operations in a logical user journey flow
 * 
 * Prerequisites:
 * - The Todo API server must be running (default: http://localhost:3000)
 * - The data store should be empty (tests assume clean state)
 * 
 * Run tests:
 *   npm test                    # Compile and run tests
 *   npm run build && node --test dist/src/api-client/api-test.js
 * 
 * Set custom API URL:
 *   API_BASE_URL=http://localhost:4000 npm test
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ApiClient } from "./api-client.js";
import type {
  CreateTodoRequest,
  UpdateTodoRequest,
} from "../models/api-model.js";

// Test configuration
const BASE_URL = process.env["API_BASE_URL"] || "http://localhost:3000/api/v1/";
const TEST_TIMEOUT = 30000; // 30 seconds

/**
 * Helper function to get a future date in YYYY-MM-DD format
 */
function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper function to get a past date in YYYY-MM-DD format (for filtering tests)
 */
function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("ApiClient E2E Tests", () => {
  let client: ApiClient;
  const createdTodoIds: string[] = [];
  const deletedTodoIds: string[] = [];

  before(() => {
    client = new ApiClient({ baseUrl: BASE_URL });
  });

  after(async () => {
    // Cleanup: Delete only remaining todos (createdTodoIds minus deletedTodoIds)
    const remainingIds = createdTodoIds.filter(id => !deletedTodoIds.includes(id));
    if (remainingIds.length > 0) {
      try {
        await client.bulkDelete({ body: { ids: remainingIds } });
      } catch (error) {
        // Ignore cleanup errors
        console.warn("Cleanup error:", error);
      }
    }
  });

  describe("Create Todo Operations", () => {
    test(
      "should create todos with varying parameters",
      { timeout: TEST_TIMEOUT },
      async () => {
        const todos: CreateTodoRequest[] = [
          // Basic todos with different priorities
          { title: "Low Priority Task", priority: "low" },
          { title: "Medium Priority Task", priority: "medium" },
          { title: "High Priority Task", priority: "high" },
          { title: "Urgent Priority Task", priority: "urgent" },

          // Todos with descriptions
          {
            title: "Task with Description",
            description: "This is a detailed description",
            priority: "medium",
          },
          {
            title: "Long Description Task",
            description: "A".repeat(500), // Long description
            priority: "high",
          },

          // Todos with due dates
          { title: "Task Due Tomorrow", dueDate: getFutureDate(1), priority: "medium" },
          { title: "Task Due Next Week", dueDate: getFutureDate(7), priority: "low" },
          { title: "Task Due Next Month", dueDate: getFutureDate(30), priority: "high" },
          { title: "Task Due Far Future", dueDate: getFutureDate(100), priority: "urgent" },

          // Todos with all fields
          {
            title: "Complete Task",
            description: "Full task with all fields",
            dueDate: getFutureDate(5),
            priority: "high",
          },
          {
            title: "Another Complete Task",
            description: "Another full task",
            dueDate: getFutureDate(10),
            priority: "medium",
          },

          // Todos for filtering tests - status variations
          { title: "Initial Status Task 1", priority: "low" },
          { title: "Initial Status Task 2", priority: "medium" },
          { title: "Initial Status Task 3", priority: "high" },

          // Todos for title filtering
          { title: "Meeting with team", priority: "medium" },
          { title: "Team standup meeting", priority: "low" },
          { title: "Review meeting notes", priority: "high" },
          { title: "Prepare presentation", priority: "urgent" },
          { title: "Presentation slides", priority: "medium" },

          // Todos for description filtering
          {
            title: "Code Review",
            description: "Review pull request for authentication",
            priority: "high",
          },
          {
            title: "Bug Fix",
            description: "Fix authentication bug in login",
            priority: "urgent",
          },
          {
            title: "Feature Work",
            description: "Implement authentication feature",
            priority: "medium",
          },

          // Todos with specific due dates for date filtering
          { title: "Early Due Date Task", dueDate: getFutureDate(2), priority: "low" },
          { title: "Mid Due Date Task", dueDate: getFutureDate(15), priority: "medium" },
          { title: "Late Due Date Task", dueDate: getFutureDate(50), priority: "high" },
        ];

        // Create all todos
        for (const todoData of todos) {
          const response = await client.createTodo({ body: todoData });
          assert.ok(response.data, "Response should have data");
          assert.strictEqual(response.data.title, todoData.title, "Title should match");
          assert.strictEqual(response.data.priority, todoData.priority || "medium", "Priority should match");
          if (todoData.description) {
            assert.strictEqual(response.data.description, todoData.description, "Description should match");
          }
          if (todoData.dueDate) {
            assert.strictEqual(response.data.dueDate, todoData.dueDate, "Due date should match");
          }
          assert.strictEqual(response.data.status, "initial", "New todos should have initial status");
          createdTodoIds.push(response.data.id);
        }

        assert.strictEqual(createdTodoIds.length, todos.length, "All todos should be created");
      }
    );
  });

  describe("List Todos - No Filters", () => {
    test(
      "should list all todos without filters",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({});
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        assert.ok(response.data.length > 0, "Should have at least one todo");
        assert.ok(response.data.length >= createdTodoIds.length, "Should return all created todos");
      }
    );
  });

  describe("List Todos - Status Filters", () => {
    test(
      "should filter by status equals initial",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { status: "equals:initial" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.strictEqual(todo.status, "initial", "All todos should have initial status");
        });
      }
    );

    test(
      "should filter by status notEquals complete",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { status: "notEquals:complete" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.notStrictEqual(todo.status, "complete", "Todos should not have complete status");
        });
      }
    );
  });

  describe("List Todos - Priority Filters", () => {
    test(
      "should filter by priority equals high",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { priority: "equals:high" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.strictEqual(todo.priority, "high", "All todos should have high priority");
        });
      }
    );

    test(
      "should filter by priority equals urgent",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { priority: "equals:urgent" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.strictEqual(todo.priority, "urgent", "All todos should have urgent priority");
        });
      }
    );

    test(
      "should filter by priority notEquals low",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { priority: "notEquals:low" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.notStrictEqual(todo.priority, "low", "Todos should not have low priority");
        });
      }
    );
  });

  describe("List Todos - Due Date Filters", () => {
    test(
      "should filter by dueDate before",
      { timeout: TEST_TIMEOUT },
      async () => {
        const beforeDate = getFutureDate(20);
        const response = await client.listTodos({
          query: { dueDate: `before:${beforeDate}` },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          if (todo.dueDate) {
            assert.ok(todo.dueDate < beforeDate, "Due date should be before the specified date");
          }
        });
      }
    );

    test(
      "should filter by dueDate after",
      { timeout: TEST_TIMEOUT },
      async () => {
        const afterDate = getFutureDate(10);
        const response = await client.listTodos({
          query: { dueDate: `after:${afterDate}` },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          if (todo.dueDate) {
            assert.ok(todo.dueDate > afterDate, "Due date should be after the specified date");
          }
        });
      }
    );

    test(
      "should filter by dueDate notBefore",
      { timeout: TEST_TIMEOUT },
      async () => {
        const notBeforeDate = getFutureDate(5);
        const response = await client.listTodos({
          query: { dueDate: `notBefore:${notBeforeDate}` },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          if (todo.dueDate) {
            assert.ok(todo.dueDate >= notBeforeDate, "Due date should not be before the specified date");
          }
        });
      }
    );

    test(
      "should filter by dueDate notAfter",
      { timeout: TEST_TIMEOUT },
      async () => {
        const notAfterDate = getFutureDate(25);
        const response = await client.listTodos({
          query: { dueDate: `notAfter:${notAfterDate}` },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          if (todo.dueDate) {
            assert.ok(todo.dueDate <= notAfterDate, "Due date should not be after the specified date");
          }
        });
      }
    );
  });

  describe("List Todos - Title Filters", () => {
    test(
      "should filter by title contains",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { title: "contains:meeting" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.ok(
            todo.title.toLowerCase().includes("meeting"),
            "Title should contain 'meeting'"
          );
        });
      }
    );

    test(
      "should filter by title notContains",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { title: "notContains:meeting" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.ok(
            !todo.title.toLowerCase().includes("meeting"),
            "Title should not contain 'meeting'"
          );
        });
      }
    );

    test(
      "should filter by title contains 'Task'",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { title: "contains:Task" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.ok(todo.title.includes("Task"), "Title should contain 'Task'");
        });
      }
    );
  });

  describe("List Todos - Description Filters", () => {
    test(
      "should filter by description contains",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { description: "contains:authentication" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          if (todo.description) {
            assert.ok(
              todo.description.toLowerCase().includes("authentication"),
              "Description should contain 'authentication'"
            );
          }
        });
      }
    );

    test(
      "should filter by description notContains",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: { description: "notContains:authentication" },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          if (todo.description) {
            assert.ok(
              !todo.description.toLowerCase().includes("authentication"),
              "Description should not contain 'authentication'"
            );
          }
        });
      }
    );
  });

  describe("List Todos - Combined Filters", () => {
    test(
      "should filter by priority and status",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: {
            priority: "equals:high",
            status: "equals:initial",
          },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.strictEqual(todo.priority, "high", "Should have high priority");
          assert.strictEqual(todo.status, "initial", "Should have initial status");
        });
      }
    );

    test(
      "should filter by title and priority",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: {
            title: "contains:Task",
            priority: "equals:medium",
          },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.ok(todo.title.includes("Task"), "Title should contain 'Task'");
          assert.strictEqual(todo.priority, "medium", "Should have medium priority");
        });
      }
    );

    test(
      "should filter by dueDate and priority",
      { timeout: TEST_TIMEOUT },
      async () => {
        const beforeDate = getFutureDate(20);
        const response = await client.listTodos({
          query: {
            dueDate: `before:${beforeDate}`,
            priority: "equals:high",
          },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.strictEqual(todo.priority, "high", "Should have high priority");
          if (todo.dueDate) {
            assert.ok(todo.dueDate < beforeDate, "Due date should be before specified date");
          }
        });
      }
    );

    test(
      "should filter by multiple fields",
      { timeout: TEST_TIMEOUT },
      async () => {
        const response = await client.listTodos({
          query: {
            priority: "equals:medium",
            status: "equals:initial",
            title: "contains:Task",
          },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        response.data.forEach((todo) => {
          assert.strictEqual(todo.priority, "medium", "Should have medium priority");
          assert.strictEqual(todo.status, "initial", "Should have initial status");
          assert.ok(todo.title.includes("Task"), "Title should contain 'Task'");
        });
      }
    );
  });

  describe("Get Todo By ID", () => {
    test(
      "should get a todo by ID",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 0, "Should have at least one created todo");
        const todoId = createdTodoIds[0]!;
        const response = await client.getTodoById({ params: { id: todoId } });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.id, todoId, "ID should match");
        assert.ok(response.data.title, "Should have title");
        assert.ok(response.data.priority, "Should have priority");
        assert.ok(response.data.status, "Should have status");
        assert.ok(response.data.createdAt, "Should have createdAt");
        assert.ok(response.data.modifiedAt, "Should have modifiedAt");
      }
    );

    test(
      "should throw error for non-existent todo",
      { timeout: TEST_TIMEOUT },
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        try {
          await client.getTodoById({ params: { id: fakeId } });
          assert.fail("Should have thrown an error");
        } catch (error) {
          assert.ok(error instanceof Error, "Should throw an Error");
        }
      }
    );
  });

  describe("Update Todo", () => {
    test(
      "should update todo title",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 0, "Should have at least one created todo");
        const todoId = createdTodoIds[0]!;
        const updateData: UpdateTodoRequest = {
          title: "Updated Title",
        };
        const response = await client.updateTodo({
          params: { id: todoId },
          body: updateData,
        });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.id, todoId, "ID should match");
        assert.strictEqual(response.data.title, "Updated Title", "Title should be updated");
      }
    );

    test(
      "should update todo description",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 1, "Should have at least two created todos");
        const todoId = createdTodoIds[1]!;
        const updateData: UpdateTodoRequest = {
          description: "Updated description",
        };
        const response = await client.updateTodo({
          params: { id: todoId },
          body: updateData,
        });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.description, "Updated description", "Description should be updated");
      }
    );

    test(
      "should update todo priority",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 2, "Should have at least three created todos");
        const todoId = createdTodoIds[2]!;
        const updateData: UpdateTodoRequest = {
          priority: "urgent",
        };
        const response = await client.updateTodo({
          params: { id: todoId },
          body: updateData,
        });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.priority, "urgent", "Priority should be updated");
      }
    );

    test(
      "should update todo due date",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 3, "Should have at least four created todos");
        const todoId = createdTodoIds[3]!;
        const newDueDate = getFutureDate(20);
        const updateData: UpdateTodoRequest = {
          dueDate: newDueDate,
        };
        const response = await client.updateTodo({
          params: { id: todoId },
          body: updateData,
        });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.dueDate, newDueDate, "Due date should be updated");
      }
    );

    test(
      "should update todo status to complete",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 4, "Should have at least five created todos");
        const todoId = createdTodoIds[4]!;
        const updateData: UpdateTodoRequest = {
          status: "complete",
        };
        const response = await client.updateTodo({
          params: { id: todoId },
          body: updateData,
        });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.status, "complete", "Status should be updated to complete");
      }
    );

    test(
      "should update multiple fields at once",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length > 5, "Should have at least six created todos");
        const todoId = createdTodoIds[5]!;
        const newDueDate = getFutureDate(25);
        const updateData: UpdateTodoRequest = {
          title: "Multi-field Update",
          description: "Updated multiple fields",
          priority: "high",
          dueDate: newDueDate,
        };
        const response = await client.updateTodo({
          params: { id: todoId },
          body: updateData,
        });
        assert.ok(response.data, "Response should have data");
        assert.strictEqual(response.data.title, "Multi-field Update", "Title should be updated");
        assert.strictEqual(response.data.description, "Updated multiple fields", "Description should be updated");
        assert.strictEqual(response.data.priority, "high", "Priority should be updated");
        assert.strictEqual(response.data.dueDate, newDueDate, "Due date should be updated");
      }
    );

    test(
      "should clear description by setting to null",
      { timeout: TEST_TIMEOUT },
      async () => {
        // Find a todo with a description
        const todosResponse = await client.listTodos({
          query: { description: "contains:description" },
        });
        if (todosResponse.data.length > 0) {
          const todoId = todosResponse.data[0]!.id;
          const updateData: UpdateTodoRequest = {
            description: null,
          };
          const response = await client.updateTodo({
            params: { id: todoId },
            body: updateData,
          });
          assert.ok(response.data, "Response should have data");
          assert.strictEqual(response.data.description, null, "Description should be cleared");
        }
      }
    );
  });

  describe("Bulk Update Status", () => {
    test(
      "should bulk update status for multiple todos",
      { timeout: TEST_TIMEOUT },
      async () => {
        assert.ok(createdTodoIds.length >= 3, "Should have at least three created todos");
        const idsToUpdate = createdTodoIds.slice(0, 3);
        const response = await client.bulkUpdateStatus({
          body: {
            ids: idsToUpdate,
            status: "complete",
          },
        });
        assert.ok(response.data, "Response should have data");
        assert.ok(Array.isArray(response.data), "Data should be an array");
        assert.strictEqual(response.data.length, idsToUpdate.length, "Should return updated todos");
        response.data.forEach((todo) => {
          assert.ok(idsToUpdate.includes(todo.id), "Todo ID should be in the update list");
          assert.strictEqual(todo.status, "complete", "Status should be updated to complete");
        });

        // Verify by getting individual todos
        for (const id of idsToUpdate) {
          const todoResponse = await client.getTodoById({ params: { id } });
          assert.strictEqual(todoResponse.data.status, "complete", "Status should be complete");
        }
      }
    );
  });

  describe("Delete Todo", () => {
    test(
      "should delete a todo",
      { timeout: TEST_TIMEOUT },
      async () => {
        // Create a todo specifically for deletion
        const createResponse = await client.createTodo({
          body: { title: "Todo to Delete", priority: "low" },
        });
        const todoId = createResponse.data.id;

        // Delete it
        await client.deleteTodo({ params: { id: todoId } });
        deletedTodoIds.push(todoId);

        // Verify it's deleted
        try {
          await client.getTodoById({ params: { id: todoId } });
          assert.fail("Should have thrown an error for deleted todo");
        } catch (error) {
          assert.ok(error instanceof Error, "Should throw an Error");
        }
      }
    );
  });

  describe("Bulk Delete", () => {
    test(
      "should bulk delete multiple todos",
      { timeout: TEST_TIMEOUT },
      async () => {
        // Create todos specifically for bulk deletion
        const todosToDelete: string[] = [];
        for (let i = 0; i < 3; i++) {
          const createResponse = await client.createTodo({
            body: { title: `Todo to Bulk Delete ${i}`, priority: "low" },
          });
          todosToDelete.push(createResponse.data.id);
        }

        // Bulk delete them
        await client.bulkDelete({ body: { ids: todosToDelete } });
        deletedTodoIds.push(...todosToDelete);

        // Verify they're all deleted
        for (const id of todosToDelete) {
          try {
            await client.getTodoById({ params: { id } });
            assert.fail(`Should have thrown an error for deleted todo ${id}`);
          } catch (error) {
            assert.ok(error instanceof Error, "Should throw an Error");
          }
        }
      }
    );
  });

  describe("Complete User Journey", () => {
    test(
      "should complete a full user journey: create, list, filter, update, complete, delete",
      { timeout: TEST_TIMEOUT },
      async () => {
        // 1. Create a todo
        const createResponse = await client.createTodo({
          body: {
            title: "Journey Todo",
            description: "A todo for the complete journey",
            dueDate: getFutureDate(7),
            priority: "high",
          },
        });
        const todoId = createResponse.data.id;
        createdTodoIds.push(todoId);
        assert.strictEqual(createResponse.data.status, "initial", "Should start as initial");

        // 2. Get the todo
        const getResponse = await client.getTodoById({ params: { id: todoId } });
        assert.strictEqual(getResponse.data.id, todoId, "Should retrieve the correct todo");

        // 3. List todos with filter
        const listResponse = await client.listTodos({
          query: {
            title: "contains:Journey",
            priority: "equals:high",
          },
        });
        assert.ok(
          listResponse.data.some((todo) => todo.id === todoId),
          "Should find the todo in filtered list"
        );

        // 4. Update the todo
        const updateResponse = await client.updateTodo({
          params: { id: todoId },
          body: {
            title: "Updated Journey Todo",
            status: "complete",
          },
        });
        assert.strictEqual(updateResponse.data.title, "Updated Journey Todo", "Title should be updated");
        assert.strictEqual(updateResponse.data.status, "complete", "Status should be complete");

        // 5. Verify it appears in complete status filter
        const completeListResponse = await client.listTodos({
          query: { status: "equals:complete" },
        });
        assert.ok(
          completeListResponse.data.some((todo) => todo.id === todoId),
          "Should find the todo in complete status list"
        );

        // 6. Delete the todo
        await client.deleteTodo({ params: { id: todoId } });
        deletedTodoIds.push(todoId);

        // 7. Verify it's deleted
        try {
          await client.getTodoById({ params: { id: todoId } });
          assert.fail("Should have thrown an error for deleted todo");
        } catch (error) {
          assert.ok(error instanceof Error, "Should throw an Error");
        }
      }
    );
  });
});

