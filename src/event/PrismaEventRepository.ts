import { Ok, Err, type Result } from "../lib/result";
import { UnexpectedDependencyError, type EventError } from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord } from "./Event";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({
  adapter,
});


function toEventRecord(event: any): IEventRecord {
  return {
    ...event,
    status: event.status as IEventRecord["status"],
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

class PrismaEventRepository implements IEventRepository {
  async create(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const created = await prisma.event.create({
        data: {
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt),
        },
      });

      return Ok(toEventRecord(created));
    } catch {
      return Err(UnexpectedDependencyError("Unable to create event."));
    }
  }

  async findById(id: string): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const event = await prisma.event.findUnique({ where: { id } });

      return Ok(event ? toEventRecord(event) : null);
    } catch {
      return Err(UnexpectedDependencyError("Unable to read event."));
    }
  }

  async findAll(): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await prisma.event.findMany();
      return Ok(events.map(toEventRecord));
    } catch {
      return Err(UnexpectedDependencyError("Unable to list events."));
    }
  }

  async findByOrganizerId(
    organizerId: string
  ): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await prisma.event.findMany({
        where: { organizerId },
      });

      return Ok(events.map(toEventRecord));
    } catch {
      return Err(
        UnexpectedDependencyError("Unable to list events for organizer.")
      );
    }
  }

  async update(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const updated = await prisma.event.update({
        where: { id: event.id },
        data: {
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          organizerId: event.organizerId,
          organizerName: event.organizerName,
          status: event.status,
          capacity: event.capacity,
          attendeeCount: event.attendeeCount,
          updatedAt: new Date(event.updatedAt),
        },
      });

      return Ok(toEventRecord(updated));
    } catch {
      return Err(UnexpectedDependencyError("Unable to update event."));
    }
  }
}

export function CreatePrismaEventRepository(): IEventRepository {
  return new PrismaEventRepository();
}
