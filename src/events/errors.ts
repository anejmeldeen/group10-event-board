export class EventNotFoundError extends Error {
  readonly name = "EventNotFoundError";

  constructor(message = "Event not found.") {
    super(message);
  }
}

export class UnauthorizedEventActionError extends Error {
  readonly name = "UnauthorizedEventActionError";

  constructor(message = "You are not allowed to perform this action.") {
    super(message);
  }
}

export class InvalidEventStateError extends Error {
  readonly name = "InvalidEventStateError";

  constructor(message = "This event cannot transition to that state.") {
    super(message);
  }
}

export class InvalidEventFilterError extends Error {
  readonly name = "InvalidEventFilterError";

  constructor(message = "Invalid filter value.") {
    super(message);
  }
}