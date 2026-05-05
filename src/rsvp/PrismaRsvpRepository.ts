import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result";
import { RsvpRepositoryError, type RsvpError } from "./errors";
import type { IRsvpRepository } from "./RsvpRepository";
import type { IRsvpRecord, RsvpStatus } from "./Rsvp";

function toRsvpRecord(row: {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: string;
}): IRsvpRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    status: row.status as RsvpStatus,
    createdAt: row.createdAt,
  };
}

class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvpRecord | null, RsvpError>> {
    try {
      const row = await this.prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      return Ok(row ? toRsvpRecord(row) : null);
    } catch (error) {
      return Err(RsvpRepositoryError("Failed to find RSVP."));
    }
  }

  async upsert(rsvp: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>> {
    try {
      const row = await this.prisma.rsvp.upsert({
        where: { eventId_userId: { eventId: rsvp.eventId, userId: rsvp.userId } },
        create: {
          id: rsvp.id,
          eventId: rsvp.eventId,
          userId: rsvp.userId,
          status: rsvp.status,
          createdAt: rsvp.createdAt,
        },
        update: {
          status: rsvp.status,
        },
      });
      return Ok(toRsvpRecord(row));
    } catch (error) {
      return Err(RsvpRepositoryError("Failed to save RSVP."));
    }
  }
// Feature 8 Sprint 3: aggregates attendee count per event using prisma.rsvp.count
// replaces in-memory counting from Sprint 1
  async countGoing(eventId: string): Promise<Result<number, RsvpError>> {
    try {
      const count = await this.prisma.rsvp.count({
        where: {
          eventId,
          status: "going",
        },
      });
      return Ok(count);
    } catch (error) {
      return Err(RsvpRepositoryError("Failed to count RSVPs."));
    }
  }
// Feature 7 Sprint 3: retrieves all RSVPs for a user ordered by createdAt
// used by getMyRsvpDashboard to group into upcoming and history sections
  async listByUser(userId: string): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const rows = await this.prisma.rsvp.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      return Ok(rows.map(toRsvpRecord));
    } catch (error) {
      return Err(RsvpRepositoryError("Failed to list RSVPs for user."));
    }
  }

  async listByEvent(eventId: string): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const rows = await this.prisma.rsvp.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
      });
      return Ok(rows.map(toRsvpRecord));
    } catch (error) {
      return Err(RsvpRepositoryError("Failed to list RSVPs for event."));
    }
  }
}

export function CreatePrismaRsvpRepository(prisma: PrismaClient): IRsvpRepository {
  return new PrismaRsvpRepository(prisma);
}
