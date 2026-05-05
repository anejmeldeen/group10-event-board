/**
 * In-memory implementation of IEventRepository.
 *
 * Events are stored in a plain array and lost on server restart.
 * This mirrors InMemoryUserRepository from the auth layer.
 */

import { Ok, Err, type Result } from "../lib/result";
import { UnexpectedDependencyError, type EventError } from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord } from "./Event";

class InMemoryEventRepository implements IEventRepository {
  private readonly events: IEventRecord[] = [];

  async create(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      this.events.push({ ...event });
      return Ok({ ...event });
    } catch {
      return Err(UnexpectedDependencyError("Unable to create the event."));
    }
  }

  async findById(id: string): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const match = this.events.find((e) => e.id === id) ?? null;
      return Ok(match ? { ...match } : null);
    } catch {
      return Err(UnexpectedDependencyError("Unable to read events."));
    }
  }

  async findAll(): Promise<Result<IEventRecord[], EventError>> {
    try {
      return Ok(this.events.map((e) => ({ ...e })));
    } catch {
      return Err(UnexpectedDependencyError("Unable to list events."));
    }
  }

  async findByOrganizerId(organizerId: string): Promise<Result<IEventRecord[], EventError>> {
    try {
      const matches = this.events.filter((e) => e.organizerId === organizerId);
      return Ok(matches.map((e) => ({ ...e })));
    } catch {
      return Err(UnexpectedDependencyError("Unable to list events for organizer."));
    }
  }

  async findPublishedUpcoming(
    query: string,
    category: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Result<IEventRecord[], EventError>> {
    try {
      const now = new Date();
      const trimmedQuery = query.trim().toLowerCase();
      const trimmedCategory = category.trim().toLowerCase();

      const matches = this.events.filter((event) => {
        if (event.status !== "published") return false;

        const eventStart = new Date(event.startDate);
        if (eventStart < now) return false;

        if (trimmedQuery) {
          const matchesQuery =
            event.title.toLowerCase().includes(trimmedQuery) ||
            event.description.toLowerCase().includes(trimmedQuery) ||
            event.location.toLowerCase().includes(trimmedQuery);
          if (!matchesQuery) return false;
        }

        if (trimmedCategory && event.category.toLowerCase() !== trimmedCategory) {
          return false;
        }

        if (startDate && eventStart < startDate) return false;
        if (endDate && eventStart > endDate) return false;

        return true;
      });

      matches.sort(
        (a, b) =>
          new Date(a.startDate).getTime() -
          new Date(b.startDate).getTime()
      );

      return Ok(matches.map((e) => ({ ...e })));
    } catch {
      return Err(UnexpectedDependencyError("Unable to filter events."));
    }
  }

  async update(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const index = this.events.findIndex((e) => e.id === event.id);
      if (index === -1) {
        return Err(UnexpectedDependencyError(`Event ${event.id} not found.`));
      }
      this.events[index] = { ...event };
      return Ok({ ...event });
    } catch {
      return Err(UnexpectedDependencyError("Unable to update the event."));
    }
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}
