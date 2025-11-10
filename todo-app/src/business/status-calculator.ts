/**
 * Status Calculation Utility
 * Calculates the current status of a todo based on stored status and due date
 */

import type { TodoEntity, CalculatedStatus } from "../models/db-model.js";

/**
 * Calculates the current status of a todo
 * 
 * Rules:
 * - If status is "complete", return "complete"
 * - If no due date, return stored status ("initial")
 * - If due date is in the past and status is "initial", return "due"
 * - Otherwise, return stored status ("initial")
 * 
 * @param todo - The todo entity
 * @param currentDate - Current date in YYYY-MM-DD format (UTC)
 * @returns The calculated status
 */
export function calculateStatus(todo: TodoEntity, currentDate: string): CalculatedStatus {
  // If already complete, always return complete
  if (todo.status === "complete") {
    return "complete";
  }

  // If no due date, return stored status
  if (todo.dueDate === null) {
    return todo.status; // "initial"
  }

  // If due date is in the past and status is "initial", return "due"
  if (currentDate > todo.dueDate && todo.status === "initial") {
    return "due";
  }

  // Otherwise, return stored status
  return todo.status; // "initial"
}

/**
 * Gets the current date in YYYY-MM-DD format (UTC)
 * @returns Current date string
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

