/**
 * Event service: business logic and validation for event creation.
 *
 * Validates all inputs before delegating to the repository.
 * Uses Result<T, E> for error handling — no thrown exceptions.
 */

import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result";
import { ValidationError, EventNotFound, EventNotAuthorized, EventInvalidState, type EventError } from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord, IEventSummary } from "./Event";
import { toEventSummary } from "./Event";
import type { IAuthenticatedUserSession } from "../session/AppSession";

/** Raw input coming from the form (all strings). */
export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  startDate: string;   // Expected: ISO 8601 or datetime-local format
  endDate: string;     // Expected: ISO 8601 or datetime-local format
  capacity: string;    // Numeric string; empty or "0" means unlimited
}

/** Raw input from the edit form. Same shape as CreateEventInput — the fields a user can change are identical. */
export interface UpdateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  startDate: string;
  endDate: string;
  capacity: string;
}

/** Identity of the organizer, extracted from the session — never from the form. */
export interface OrganizerIdentity {
  userId: string;
  displayName: string;
}

export interface IEventService {
  createEvent(
    input: CreateEventInput,
    organizer: OrganizerIdentity,
  ): Promise<Result<IEventSummary, EventError>>;

  getEventDetails(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventRecord, EventError>>;

  listVisibleEvents(
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventRecord[], EventError>>;

  publishEvent(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>>;
  
  updateEvent(
    eventId: string,
    input: UpdateEventInput,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>>;
}

// ── Validation helpers ───────────────────────────────────────────────

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 300;
const MAX_CATEGORY_LENGTH = 100;
const MAX_CAPACITY = 100_000;

function validateTitle(title: string): EventError | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return ValidationError("Title is required.");
  }
  if (trimmed.length < 3) {
    return ValidationError("Title must be at least 3 characters.");
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return ValidationError(`Title must be at most ${MAX_TITLE_LENGTH} characters.`);
  }
  return null;
}

function validateDescription(description: string): EventError | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return ValidationError("Description is required.");
  }
  if (trimmed.length < 10) {
    return ValidationError("Description must be at least 10 characters.");
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return ValidationError(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`);
  }
  return null;
}

function validateLocation(location: string): EventError | null {
  const trimmed = location.trim();
  if (!trimmed) {
    return ValidationError("Location is required.");
  }
  if (trimmed.length > MAX_LOCATION_LENGTH) {
    return ValidationError(`Location must be at most ${MAX_LOCATION_LENGTH} characters.`);
  }
  return null;
}

function validateCategory(category: string): EventError | null {
  const trimmed = category.trim();
  if (!trimmed) {
    return ValidationError("Category is required.");
  }
  if (trimmed.length > MAX_CATEGORY_LENGTH) {
    return ValidationError(`Category must be at most ${MAX_CATEGORY_LENGTH} characters.`);
  }
  return null;
}

function parseAndValidateDate(raw: string, fieldName: string): Result<Date, EventError> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return Err(ValidationError(`${fieldName} is required.`));
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return Err(ValidationError(`${fieldName} is not a valid date.`));
  }

  return Ok(parsed);
}

function validateDateRange(start: Date, end: Date): EventError | null {
  if (end <= start) {
    return ValidationError("End date must be after the start date.");
  }

  // Events should not start in the past (allow 1-minute clock skew)
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000);
  if (start < oneMinuteAgo) {
    return ValidationError("Start date cannot be in the past.");
  }

  return null;
}

function parseAndValidateCapacity(raw: string): Result<number, EventError> {
  const trimmed = raw.trim();

  // Empty or "0" means unlimited
  if (!trimmed || trimmed === "0") {
    return Ok(0);
  }

  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0) {
    return Err(ValidationError("Capacity must be a non-negative whole number."));
  }
  if (num > MAX_CAPACITY) {
    return Err(ValidationError(`Capacity must be at most ${MAX_CAPACITY}.`));
  }

  return Ok(num);
}

// ── Service implementation ───────────────────────────────────────────

class EventService implements IEventService {
  constructor(private readonly repo: IEventRepository) {}

  async createEvent(
    input: CreateEventInput,
    organizer: OrganizerIdentity,
  ): Promise<Result<IEventSummary, EventError>> {
    // 1. Validate title
    const titleErr = validateTitle(input.title);
    if (titleErr) return Err(titleErr);

    // 2. Validate description
    const descErr = validateDescription(input.description);
    if (descErr) return Err(descErr);

    // 3. Validate location
    const locErr = validateLocation(input.location);
    if (locErr) return Err(locErr);

    // 3.5 Validate category
    const catErr = validateCategory(input.category);
    if (catErr) return Err(catErr);

    // 4. Parse & validate dates
    const startResult = parseAndValidateDate(input.startDate, "Start date");
    if (startResult.ok === false) return Err(startResult.value);
    const startDate = startResult.value;

    const endResult = parseAndValidateDate(input.endDate, "End date");
    if (endResult.ok === false) return Err(endResult.value);
    const endDate = endResult.value;

    const rangeErr = validateDateRange(startDate, endDate);
    if (rangeErr) return Err(rangeErr);

    // 5. Parse & validate capacity
    const capResult = parseAndValidateCapacity(input.capacity);
    if (capResult.ok === false) return Err(capResult.value);
    const capacity = capResult.value;

    // 6. Build the event record
    const now = new Date().toISOString();
    const event: IEventRecord = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      category: input.category.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      organizerId: organizer.userId,
      organizerName: organizer.displayName,
      status: "draft",
      capacity,
      attendeeCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Persist
    const created = await this.repo.create(event);
    if (created.ok === false) return Err(created.value);

    return Ok(toEventSummary(created.value));
  }

  async getEventDetails(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventRecord, EventError>> {
    const eventResult = await this.repo.findById(eventId);
    if (eventResult.ok === false) {
      return Err(eventResult.value);
    }
    
    const event = eventResult.value;
    if (!event) {
      return Err(EventNotFound("Event not found."));
    }

    if (event.status === "draft") {
      const isOwner = currentUser?.userId === event.organizerId;
      const isAdmin = currentUser?.role === "admin";
      
      if (!isOwner && !isAdmin) {
        return Err(EventNotFound("Event not found."));
      }
    }

    return Ok(event);
  }

  async listVisibleEvents(
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventRecord[], EventError>> {
    const allResult = await this.repo.findAll();
    if (allResult.ok === false) return Err(allResult.value);
    
    const events = allResult.value;
    const isUserAdmin = currentUser?.role === "admin";
    
    const visibleEvents = events.filter((e) => {
      if (e.status !== "draft") return true; 
      
      // If draft, check permissions
      const isOwner = currentUser?.userId === e.organizerId;
      return isOwner || isUserAdmin;
    });
    
    // Sort chronologically by start date
    visibleEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return Ok(visibleEvents);
  }

  async publishEvent(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>> {
    const eventResult = await this.repo.findById(eventId);
    if (eventResult.ok === false) return Err(eventResult.value);
    
    const event = eventResult.value;
    if (!event) return Err(EventNotFound("Event not found."));

    const isOwner = currentUser?.userId === event.organizerId;
    const isAdmin = currentUser?.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return Err(EventNotFound("Event not found."));
    }

    if (event.status !== "draft") {
      return Err(ValidationError("Only draft events can be published."));
    }

    event.status = "published";
    event.updatedAt = new Date().toISOString();

    const updateResult = await this.repo.update(event);
    if (updateResult.ok === false) return Err(updateResult.value);

    return Ok(toEventSummary(updateResult.value));
  }

  async updateEvent(
    eventId: string,
    input: UpdateEventInput,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>> {
    // 1. Load the event
    const eventResult = await this.repo.findById(eventId);
    if (eventResult.ok === false) return Err(eventResult.value);

    const event = eventResult.value;
    if (!event) {
      return Err(EventNotFound("Event not found."));
    }

    // 2. Check permission: organizer or admin only
    const isOwner = currentUser?.userId === event.organizerId;
    const isAdmin = currentUser?.role === "admin";
    if (!isOwner && !isAdmin) {
      return Err(EventNotAuthorized("You do not have permission to edit this event."));
    }

    // 3. Check state: cancelled events cannot be edited
    if (event.status === "cancelled") {
      return Err(EventInvalidState("Cancelled events cannot be edited."));
    }

    // 4. Validate input — reuse the same helpers as createEvent
    const titleErr = validateTitle(input.title);
    if (titleErr) return Err(titleErr);

    const descErr = validateDescription(input.description);
    if (descErr) return Err(descErr);

    const locErr = validateLocation(input.location);
    if (locErr) return Err(locErr);

    const catErr = validateCategory(input.category);
    if (catErr) return Err(catErr);

    const startResult = parseAndValidateDate(input.startDate, "Start date");
    if (startResult.ok === false) return Err(startResult.value);
    const startDate = startResult.value;

    const endResult = parseAndValidateDate(input.endDate, "End date");
    if (endResult.ok === false) return Err(endResult.value);
    const endDate = endResult.value;

    const rangeErr = validateDateRange(startDate, endDate);
    if (rangeErr) return Err(rangeErr);

    const capResult = parseAndValidateCapacity(input.capacity);
    if (capResult.ok === false) return Err(capResult.value);
    const capacity = capResult.value;

    // 5. Build the updated record
    const updatedEvent: IEventRecord = {
      ...event,
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      category: input.category.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      capacity,
      updatedAt: new Date().toISOString(),
    };

    // 6. Persist
    const saveResult = await this.repo.update(updatedEvent);
    if (saveResult.ok === false) return Err(saveResult.value);

    return Ok(toEventSummary(saveResult.value));
  }
}

export function CreateEventService(repo: IEventRepository): IEventService {
  return new EventService(repo);
}
