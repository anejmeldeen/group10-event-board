import type { Event } from "./Event";
import type { IEventRepository } from "./EventRepository";

export class InMemoryEventRepository implements IEventRepository {
  private readonly events = new Map<string, Event>();

  constructor(seedEvents: Event[] = []) {
    for (const event of seedEvents) {
      this.events.set(event.id, { ...event });
    }
  }

  async findById(id: string): Promise<Event | null> {
    const event = this.events.get(id);
    return event ? { ...event } : null;
  }

  async findAll(): Promise<Event[]> {
    return Array.from(this.events.values()).map((event) => ({ ...event }));
  }

  async save(event: Event): Promise<Event> {
    const updated: Event = {
      ...event,
      updatedAt: new Date(),
    };

    this.events.set(updated.id, updated);
    return { ...updated };
  }
}