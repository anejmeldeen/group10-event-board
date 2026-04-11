import { Ok, Err, type Result } from "../lib/result";
import type { IRsvpRecord } from "./Rsvp";
import type { IRsvpRepository } from "./RsvpRepository";
import { RsvpRepositoryError, type RsvpError } from "./errors";

function compositeKey(eventId: string, userId: string): string {
  return `${eventId}:${userId}`;
}

class InMemoryRsvpRepository implements IRsvpRepository {
  private readonly rsvps: Map<string, IRsvpRecord> = new Map();

  async findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvpRecord | null, RsvpError>> {
    try {
      return Ok(this.rsvps.get(compositeKey(eventId, userId)) ?? null);
    } catch {
      return Err(RsvpRepositoryError("Failed to find RSVP."));
    }
  }

  async upsert(rsvp: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>> {
    try {
      const key = compositeKey(rsvp.eventId, rsvp.userId);
      this.rsvps.set(key, { ...rsvp });
      return Ok({ ...rsvp });
    } catch {
      return Err(RsvpRepositoryError("Failed to save RSVP."));
    }
  }

  async countGoing(eventId: string): Promise<Result<number, RsvpError>> {
    try {
      let count = 0;
      for (const rsvp of this.rsvps.values()) {
        if (rsvp.eventId === eventId && rsvp.status === "going") {
          count++;
        }
      }
      return Ok(count);
    } catch {
      return Err(RsvpRepositoryError("Failed to count RSVPs."));
    }
  }

  async listByUser(userId: string): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const results: IRsvpRecord[] = [];
      for (const rsvp of this.rsvps.values()) {
        if (rsvp.userId === userId) {
          results.push({ ...rsvp });
        }
      }
      return Ok(results);
    } catch {
      return Err(RsvpRepositoryError("Failed to list RSVPs for user."));
    }
  }

  async listByEvent(eventId: string): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const results: IRsvpRecord[] = [];
      for (const rsvp of this.rsvps.values()) {
        if (rsvp.eventId === eventId) {
          results.push({ ...rsvp });
        }
      }
      return Ok(results);
    } catch {
      return Err(RsvpRepositoryError("Failed to list RSVPs for event."));
    }
  }
}

export function CreateInMemoryRsvpRepository(): IRsvpRepository {
  return new InMemoryRsvpRepository();
}