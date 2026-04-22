/**
 * Event service: business logic and validation for event creation.
 *
 * Validates all inputs before delegating to the repository.
 * Uses Result<T, E> for error handling — no thrown exceptions.
 */

import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result";
import {
  MissingRequiredField,
  FieldTooShort,
  FieldTooLong,
  InvalidDateFormat,
  EndBeforeStart,
  StartDateInPast,
  InvalidCapacity,
  EventNotFound,
  EventNotAuthorized,
  EventInvalidState,
  type EventError,
} from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord, IEventSummary } from "./Event";
import { toEventSummary } from "./Event";
import type { IAuthenticatedUserSession } from "../session/AppSession";
import type { IRsvpRepository } from "../rsvp/RsvpRepository";

export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  startDate: string;
  endDate: string;
  capacity: string;
}

export interface UpdateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  startDate: string;
  endDate: string;
  capacity: string;
}

export interface OrganizerIdentity {
  userId: string;
  displayName: string;
}

export interface IOrganizerDashboardItem {
  id: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  status: string;
  capacity: number;
  attendeeCount: number;
}

export interface IOrganizerDashboardData {
  draft: IOrganizerDashboardItem[];
  published: IOrganizerDashboardItem[];
  cancelledOrPast: IOrganizerDashboardItem[];
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

  getOrganizerDashboard(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IOrganizerDashboardData, EventError>>;

  listVisibleEvents(
    currentUser: IAuthenticatedUserSession | null,
    query: string,
  ): Promise<Result<IEventRecord[], EventError>>;

  publishEvent(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>>;

  cancelEvent(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>>;

  updateEvent(
    eventId: string,
    input: UpdateEventInput,
    currentUser: IAuthenticatedUserSession | null,
  ): Promise<Result<IEventSummary, EventError>>;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 300;
const MAX_CATEGORY_LENGTH = 100;
const MAX_CAPACITY = 100_000;
const MAX_SEARCH_QUERY_LENGTH = 100;

function validateTitle(title: string): EventError | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return MissingRequiredField("Title is required.", "title");
  }
  if (trimmed.length < 3) {
    return FieldTooShort("Title must be at least 3 characters.", "title");
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return FieldTooLong(`Title must be at most ${MAX_TITLE_LENGTH} characters.`, "title");
  }
  return null;
}

function validateDescription(description: string): EventError | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return MissingRequiredField("Description is required.", "description");
  }
  if (trimmed.length < 10) {
    return FieldTooShort("Description must be at least 10 characters.", "description");
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return FieldTooLong(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`, "description");
  }
  return null;
}

function validateLocation(location: string): EventError | null {
  const trimmed = location.trim();
  if (!trimmed) {
    return MissingRequiredField("Location is required.", "location");
  }
  if (trimmed.length > MAX_LOCATION_LENGTH) {
    return FieldTooLong(`Location must be at most ${MAX_LOCATION_LENGTH} characters.`, "location");
  }
  return null;
}

function validateCategory(category: string): EventError | null {
  const trimmed = category.trim();
  if (!trimmed) {
    return MissingRequiredField("Category is required.", "category");
  }
  if (trimmed.length > MAX_CATEGORY_LENGTH) {
    return FieldTooLong(`Category must be at most ${MAX_CATEGORY_LENGTH} characters.`, "category");
  }
  return null;
}

function validateSearchQuery(query: string): EventError | null {
  const trimmed = query.trim();
  if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    return FieldTooLong(
      `Search query must be at most ${MAX_SEARCH_QUERY_LENGTH} characters.`,
      "query",
    );
  }
  return null;
}

function parseAndValidateDate(raw: string, fieldName: string): Result<Date, EventError> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return Err(MissingRequiredField(`${fieldName} is required.`, fieldName.toLowerCase().replace(/ /g, "")));
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return Err(InvalidDateFormat(`${fieldName} is not a valid date.`, fieldName.toLowerCase().replace(/ /g, "")));
  }

  return Ok(parsed);
}

function validateDateRange(start: Date, end: Date): EventError | null {
  if (end <= start) {
    return EndBeforeStart("End date must be after the start date.");
  }

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000);
  if (start < oneMinuteAgo) {
    return StartDateInPast("Start date cannot be in the past.");
  }

  return null;
}

function parseAndValidateCapacity(raw: string): Result<number, EventError> {
  const trimmed = raw.trim();

  if (!trimmed || trimmed === "0") {
    return Ok(0);
  }

  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0) {
    return Err(InvalidCapacity("Capacity must be a non-negative whole number."));
  }
  if (num > MAX_CAPACITY) {
    return Err(InvalidCapacity(`Capacity must be at most ${MAX_CAPACITY}.`));
  }

  return Ok(num);
}

class EventService implements IEventService {
  constructor(
    private readonly repo: IEventRepository,
    private readonly rsvpRepo: IRsvpRepository,
  ) {}

  async createEvent(
    input: CreateEventInput,
    organizer: OrganizerIdentity,
  ): Promise<Result<IEventSummary, EventError>> {
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
    query: string,
  ): Promise<Result<IEventRecord[], EventError>> {
    const queryErr = validateSearchQuery(query);
    if (queryErr) return Err(queryErr);

    const allResult = await this.repo.findAll();
    if (allResult.ok === false) return Err(allResult.value);

    const events = allResult.value;
    const isUserAdmin = currentUser?.role === "admin";
    const trimmedQuery = query.trim().toLowerCase();

    const visibleEvents = events.filter((e) => {
      if (e.status === "draft") {
        const isOwner = currentUser?.userId === e.organizerId;
        if (!isOwner && !isUserAdmin) {
          return false;
        }
      }

      if (!trimmedQuery) {
        return true;
      }

      return (
        e.title.toLowerCase().includes(trimmedQuery) ||
        e.description.toLowerCase().includes(trimmedQuery) ||
        e.location.toLowerCase().includes(trimmedQuery)
      );
    });

    visibleEvents.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

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
      return Err(EventNotFound("You do not have permission to publish this event."));
    }

    if (event.status !== "draft") {
      return Err(EventInvalidState("Only draft events can be published."));
    }

    event.status = "published";
    event.updatedAt = new Date().toISOString();

    const updateResult = await this.repo.update(event);
    if (updateResult.ok === false) return Err(updateResult.value);

    return Ok(toEventSummary(updateResult.value));
  }

  async cancelEvent(
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
    return Err(EventNotAuthorized("You do not have permission to cancel this event."));
    }

    if (event.status !== "published") {
    return Err(EventInvalidState("Only published events can be cancelled."));
    }

    event.status = "cancelled";
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
    const eventResult = await this.repo.findById(eventId);
    if (eventResult.ok === false) return Err(eventResult.value);

    const event = eventResult.value;
    if (!event) {
      return Err(EventNotFound("Event not found."));
    }

    const isOwner = currentUser?.userId === event.organizerId;
    const isAdmin = currentUser?.role === "admin";
    if (!isOwner && !isAdmin) {
      return Err(EventNotAuthorized("You do not have permission to edit this event."));
    }

    if (event.status === "cancelled") {
      return Err(EventInvalidState("Cancelled events cannot be edited."));
    }

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

    const saveResult = await this.repo.update(updatedEvent);
    if (saveResult.ok === false) return Err(saveResult.value);

    return Ok(toEventSummary(saveResult.value));
  }

  async getOrganizerDashboard(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IOrganizerDashboardData, EventError>> {
    if (currentUser.role !== "admin" && currentUser.role !== "staff") {
      return Err(EventNotAuthorized("Members cannot access the organizer dashboard."));
    }

    const eventsResult =
      currentUser.role === "admin"
        ? await this.repo.findAll()
        : await this.repo.findByOrganizerId(currentUser.userId);

    if (eventsResult.ok === false) {
      return Err(eventsResult.value);
    }

    const draft: IOrganizerDashboardItem[] = [];
    const published: IOrganizerDashboardItem[] = [];
    const cancelledOrPast: IOrganizerDashboardItem[] = [];

    for (const event of eventsResult.value) {
      const countResult = await this.rsvpRepo.countGoing(event.id);
      if (countResult.ok === false) {
        return Err(EventNotAuthorized("Could not load attendee count."));
      }

      const item: IOrganizerDashboardItem = {
        id: event.id,
        title: event.title,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        capacity: event.capacity,
        attendeeCount: countResult.value,
      };

      const isPast = new Date(event.endDate) < new Date();

      if (event.status === "draft") {
        draft.push(item);
      } else if (event.status === "published" && !isPast) {
        published.push(item);
      } else {
        cancelledOrPast.push(item);
      }
    }

    draft.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    published.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    cancelledOrPast.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

    return Ok({
      draft,
      published,
      cancelledOrPast,
    });
  }
}

export function CreateEventService(
  repo: IEventRepository,
  rsvpRepo: IRsvpRepository,
): IEventService {
  return new EventService(repo, rsvpRepo);
}