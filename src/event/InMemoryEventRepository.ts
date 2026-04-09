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
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}
