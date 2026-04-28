import type { PrismaClient } from ".prisma/client/default";
import { Ok, Err, type Result } from "../lib/result";
import { RsvpRepositoryError, type RsvpError } from "./errors";
import type { IRsvpRepository } from "./RsvpRepository";
import type { IRsvpRecord } from "./Rsvp";

class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvpRecord | null, RsvpError>> {
    try {
      const rsvp = await this.prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      return Ok(rsvp as IRsvpRecord | null);
    } catch (e) {
      return Err(RsvpRepositoryError(`Failed to find RSVP: ${e}`));
    }
  }

  async upsert(rsvp: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>> {
    try {
      const saved = await this.prisma.rsvp.upsert({
        where: { eventId_userId: { eventId: rsvp.eventId, userId: rsvp.userId } },
        create: rsvp,
        update: { status: rsvp.status },
      });
      return Ok(saved as IRsvpRecord);
    } catch (e) {
      return Err(RsvpRepositoryError(`Failed to save RSVP: ${e}`));
    }
  }

  async countGoing(eventId: string): Promise<Result<number, RsvpError>> {
    try {
      const count = await this.prisma.rsvp.count({
        where: { eventId, status: "going" },
      });
      return Ok(count);
    } catch (e) {
      return Err(RsvpRepositoryError(`Failed to count RSVPs: ${e}`));
    }
  }

  async listByUser(userId: string): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({ where: { userId } });
      return Ok(rsvps as IRsvpRecord[]);
    } catch (e) {
      return Err(RsvpRepositoryError(`Failed to list RSVPs for user: ${e}`));
    }
  }

  async listByEvent(eventId: string): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const rsvps = await this.prisma.rsvp.findMany({ where: { eventId } });
      return Ok(rsvps as IRsvpRecord[]);
    } catch (e) {
      return Err(RsvpRepositoryError(`Failed to list RSVPs for event: ${e}`));
    }
  }
}

export function CreatePrismaRsvpRepository(prisma: PrismaClient): IRsvpRepository {
  return new PrismaRsvpRepository(prisma);
}