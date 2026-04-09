// STUB — owned by Feature 1 (Teammate A).
// Delete and use A's version once F1 is merged to dev.
// Seeded with a few fake events so Feature 3 can be tested in the browser.

import { Err, Ok, type Result } from "../lib/result";
import type { IEventRecord } from "./Event";
import type { IEventRepository } from "./EventRepository";
import { EventRepositoryError, type EventError } from "./errors";

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const SEED_EVENTS: IEventRecord[] = [
  {
    id: "evt-1",
    title: "Intro to TypeScript",
    description: "A beginner-friendly walkthrough of TypeScript basics.",
    location: "Room 101",
    category: "workshop",
    status: "published",
    capacity: 30,
    startDatetime: daysFromNow(7),
    endDatetime: daysFromNow(7),
    organizerId: "user-staff",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "evt-2",
    title: "Draft: Spring Hackathon",
    description: "Still being planned — details coming soon.",
    location: "TBD",
    category: "hackathon",
    status: "draft",
    capacity: null,
    startDatetime: daysFromNow(30),
    endDatetime: daysFromNow(31),
    organizerId: "user-staff",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "evt-3",
    title: "Cancelled Meetup",
    description: "This meetup was cancelled — editing should be rejected.",
    location: "Cafeteria",
    category: "social",
    status: "cancelled",
    capacity: 20,
    startDatetime: daysFromNow(5),
    endDatetime: daysFromNow(5),
    organizerId: "user-staff",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

class InMemoryEventRepository implements IEventRepository {
  private readonly events: Map<string, IEventRecord>;

  constructor(seed: IEventRecord[]) {
    this.events = new Map(seed.map((e) => [e.id, e]));
  }

  async findById(id: string): Promise<Result<IEventRecord | null, EventError>> {
    try {
      return Ok(this.events.get(id) ?? null);
    } catch {
      return Err(EventRepositoryError("Failed to read event."));
    }
  }

  async listAll(): Promise<Result<IEventRecord[], EventError>> {
    try {
      return Ok([...this.events.values()]);
    } catch {
      return Err(EventRepositoryError("Failed to list events."));
    }
  }

  async create(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      this.events.set(event.id, event);
      return Ok(event);
    } catch {
      return Err(EventRepositoryError("Failed to create event."));
    }
  }

  async update(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      this.events.set(event.id, event);
      return Ok(event);
    } catch {
      return Err(EventRepositoryError("Failed to update event."));
    }
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository([...SEED_EVENTS]);
}