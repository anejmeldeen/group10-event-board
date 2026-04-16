import { Err, Ok, type Result } from "../lib/result";
import type { Event, EventCategory } from "./Event";
import type { IEventRepository } from "./EventRepository";
import {
  EventNotFoundError,
  InvalidEventFilterError,
  InvalidEventStateError,
  UnauthorizedEventActionError,
} from "./errors";

export type TimeframeFilter = "all-upcoming" | "this-week" | "this-weekend";

type EventServiceError =
  | EventNotFoundError
  | UnauthorizedEventActionError
  | InvalidEventStateError
  | InvalidEventFilterError;

export interface FilterEventsInput {
  category?: string;
  timeframe?: string;
  now?: Date;
}

export class EventService {
  constructor(private readonly eventRepository: IEventRepository) {}

  async publishEvent(
    eventId: string,
    actingUserId: string,
  ): Promise<Result<Event, EventServiceError>> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      return Err(new EventNotFoundError());
    }

    if (event.organizerId !== actingUserId) {
      return Err(
        new UnauthorizedEventActionError(
          "Only the organizer can publish this event.",
        ),
      );
    }

    if (event.status !== "draft") {
      return Err(
        new InvalidEventStateError("Only draft events can be published."),
      );
    }

    event.status = "published";
    const saved = await this.eventRepository.save(event);
    return Ok(saved);
  }

  async cancelEvent(
    eventId: string,
    actingUserId: string,
    actingUserRole: string,
  ): Promise<Result<Event, EventServiceError>> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      return Err(new EventNotFoundError());
    }

    const isOrganizer = event.organizerId === actingUserId;
    const isAdmin = actingUserRole === "admin";

    if (!isOrganizer && !isAdmin) {
      return Err(
        new UnauthorizedEventActionError(
          "Only the organizer or an admin can cancel this event.",
        ),
      );
    }

    if (event.status !== "published") {
      return Err(
        new InvalidEventStateError("Only published events can be cancelled."),
      );
    }

    event.status = "cancelled";
    const saved = await this.eventRepository.save(event);
    return Ok(saved);
  }

  async filterPublishedEvents(
    input: FilterEventsInput,
  ): Promise<Result<Event[], EventServiceError>> {
    const allEvents = await this.eventRepository.findAll();

    const category = this.parseCategory(input.category);
    if (input.category && !category) {
      return Err(new InvalidEventFilterError("Invalid category filter."));
    }

    const timeframe = this.parseTimeframe(input.timeframe);
    if (input.timeframe && !timeframe) {
      return Err(new InvalidEventFilterError("Invalid timeframe filter."));
    }

    const now = input.now ?? new Date();

    let filtered = allEvents.filter(
      (event: Event) => event.status === "published" && event.startAt >= now,
    );

    if (category) {
      filtered = filtered.filter((event: Event) => event.category === category);
    }

    if (timeframe === "this-week") {
      const end = this.endOfWeek(now);
      filtered = filtered.filter(
        (event: Event) => event.startAt >= now && event.startAt <= end,
      );
    }

    if (timeframe === "this-weekend") {
      const { start, end } = this.getWeekendRange(now);
      filtered = filtered.filter(
        (event: Event) => event.startAt >= start && event.startAt <= end,
      );
    }

    filtered.sort(
      (a: Event, b: Event) => a.startAt.getTime() - b.startAt.getTime(),
    );

    return Ok(filtered);
  }

  private parseCategory(value?: string): EventCategory | undefined {
    if (!value || value.trim() === "") {
      return undefined;
    }

    const allowed: EventCategory[] = [
      "social",
      "educational",
      "volunteer",
      "sports",
      "arts",
    ];

    return allowed.includes(value as EventCategory)
      ? (value as EventCategory)
      : undefined;
  }

  private parseTimeframe(value?: string): TimeframeFilter | undefined {
    if (!value || value.trim() === "") {
      return undefined;
    }

    const allowed: TimeframeFilter[] = [
      "all-upcoming",
      "this-week",
      "this-weekend",
    ];

    return allowed.includes(value as TimeframeFilter)
      ? (value as TimeframeFilter)
      : undefined;
  }

  private endOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    result.setDate(result.getDate() + daysUntilSunday);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private getWeekendRange(date: Date): { start: Date; end: Date } {
    const current = new Date(date);
    const day = current.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;

    const start = new Date(current);
    start.setDate(current.getDate() + daysUntilSaturday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}