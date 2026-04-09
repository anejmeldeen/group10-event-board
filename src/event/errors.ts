/**
 * Event-specific error types following the same discriminated-union
 * pattern used in auth/errors.ts.
 */

export type EventError =
  | { name: "ValidationError"; message: string }
  | { name: "EventNotFound"; message: string }
  | { name: "UnexpectedDependencyError"; message: string };

export const ValidationError = (message: string): EventError => ({
  name: "ValidationError",
  message,
});

export const EventNotFound = (message: string): EventError => ({
  name: "EventNotFound",
  message,
});

export const UnexpectedDependencyError = (message: string): EventError => ({
  name: "UnexpectedDependencyError",
  message,
});
