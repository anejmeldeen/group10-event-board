import { Ok, Err, type Result } from "../lib/result";
import { UnexpectedDependencyError, type EventError } from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord } from "./Event";
import { PrismaClient } from "@prisma/client";

function toEventRecord(event: any): IEventRecord {
  return {
    ...event,
    status: event.status as IEventRecord["status"],
  };
}

class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const created = await this.prisma.event.create({
        data: {
          ...event,
        },
      });

      return Ok(toEventRecord(created));
    } catch (e: any) {
      return Err(UnexpectedDependencyError(`Unable to create event: ${e?.message ?? String(e)}`));
    }
  }

  async findById(id: string): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { id } });

      return Ok(event ? toEventRecord(event) : null);
    } catch (e: any) {
      return Err(UnexpectedDependencyError(`Unable to read event: ${e?.message ?? String(e)}`));
    }
  }

  async findAll(): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await this.prisma.event.findMany();
      return Ok(events.map(toEventRecord));
    } catch (e: any) {
      return Err(UnexpectedDependencyError(`Unable to list events: ${e?.message ?? String(e)}`));
    }
  }

  async findByOrganizerId(
    organizerId: string
  ): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await this.prisma.event.findMany({
        where: { organizerId },
      });

      return Ok(events.map(toEventRecord));
    } catch (e: any) {
      return Err(
        UnexpectedDependencyError(`Unable to list events for organizer: ${e?.message ?? String(e)}`)
      );
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
      const trimmedQuery = query.trim();
      const trimmedCategory = category.trim();

      const events = await this.prisma.event.findMany({
        where: {
          status: "published",
          startDate: {
            gte: startDate ? startDate.toISOString() : now.toISOString(),
            ...(endDate ? { lte: endDate.toISOString() } : {}),
          },
          ...(trimmedCategory ? { category: trimmedCategory } : {}),
          ...(trimmedQuery
            ? {
                OR: [
                  { title: { contains: trimmedQuery } },
                  { description: { contains: trimmedQuery } },
                  { location: { contains: trimmedQuery } },
                ],
              }
            : {}),
        },
        orderBy: {
          startDate: "asc",
        },
      });

      return Ok(events.map(toEventRecord));
    } catch {
      return Err(UnexpectedDependencyError("Unable to filter events."));
    }
  }

  async update(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const updated = await this.prisma.event.update({
        where: { id: event.id },
        data: {
          ...event,
        },
      });

      return Ok(toEventRecord(updated));
    } catch (e: any) {
      return Err(UnexpectedDependencyError(`Unable to update event: ${e?.message ?? String(e)}`));
    }
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma);
}
