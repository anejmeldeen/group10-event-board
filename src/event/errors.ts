/**
 * Event-specific error types following the same discriminated-union
 * pattern used in auth/errors.ts.
 *
 * Each named error captures a distinct way that an event operation can fail.
 *
 * Sprint 2 — every creation-failure path has a dedicated name so integration
 * tests can assert on error.name without inspecting message strings.
 * (Everything implemented here is compliant with Sprint 2).
 */

export type EventError =
  | { name: "ValidationError"; message: string; field?: string }
  | { name: "EventNotFound"; message: string }
  | { name: "EventNotAuthorized"; message: string }
  | { name: "EventInvalidState"; message: string }
  | { name: "EndBeforeStart"; message: string }
  | { name: "StartDateInPast"; message: string }
  | { name: "InvalidDateFormat"; message: string; field?: string }
  | { name: "InvalidCapacity"; message: string }
  | { name: "MissingRequiredField"; message: string; field: string }
  | { name: "FieldTooShort"; message: string; field: string }
  | { name: "FieldTooLong"; message: string; field: string }
  | { name: "UnexpectedDependencyError"; message: string };

export const ValidationError = (message: string, field?: string): EventError => ({
  name: "ValidationError",
  message,
  field,
});

export const EventNotFound = (message: string): EventError => ({
  name: "EventNotFound",
  message,
});

export const EventNotAuthorized = (message: string): EventError => ({
  name: "EventNotAuthorized",
  message,
});

export const EventInvalidState = (message: string): EventError => ({
  name: "EventInvalidState",
  message,
});

export const EndBeforeStart = (message: string): EventError => ({
  name: "EndBeforeStart",
  message,
});

export const StartDateInPast = (message: string): EventError => ({
  name: "StartDateInPast",
  message,
});

export const InvalidDateFormat = (message: string, field?: string): EventError => ({
  name: "InvalidDateFormat",
  message,
  field,
});

export const InvalidCapacity = (message: string): EventError => ({
  name: "InvalidCapacity",
  message,
});

export const MissingRequiredField = (message: string, field: string): EventError => ({
  name: "MissingRequiredField",
  message,
  field,
});

export const FieldTooShort = (message: string, field: string): EventError => ({
  name: "FieldTooShort",
  message,
  field,
});

export const FieldTooLong = (message: string, field: string): EventError => ({
  name: "FieldTooLong",
  message,
  field,
});

export const UnexpectedDependencyError = (message: string): EventError => ({
  name: "UnexpectedDependencyError",
  message,
});