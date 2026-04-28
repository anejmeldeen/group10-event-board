/**
 * Prisma-backed implementation of IEventRepository.
 *
 * Replaces the in-memory repository for Sprint 3.
 * All CRUD operations delegate to Prisma Client, which talks to SQLite.
 */

import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result";
import { UnexpectedDependencyError, type EventError } from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord, EventStatus } from "./Event";

/**
 * Map a Prisma row (status stored as string) back to IEventRecord.
 */
function toEventRecord(row: {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  startDate: string;
  endDate: string;
  organizerId: string;
  organizerName: string;
  status: string;
  capacity: number;
  attendeeCount: number;
  createdAt: string;
  updatedAt: string;
}): IEventRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    category: row.category,
    startDate: row.startDate,
    endDate: row.endDate,
    organizerId: row.organizerId,
    organizerName: row.organizerName,
    status: row.status as EventStatus,
    capacity: row.capacity,
    attendeeCount: row.attendeeCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const row = await this.prisma.event.create({
        data: {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          startDate: event.startDate,
          endDate: event.endDate,
          organizerId: event.organizerId,
          organizerName: event.organizerName,
          status: event.status,
          capacity: event.capacity,
          attendeeCount: event.attendeeCount,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        },
      });
      return Ok(toEventRecord(row));
    } catch (error) {
      return Err(UnexpectedDependencyError("Unable to create the event."));
    }
  }

  async findById(id: string): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const row = await this.prisma.event.findUnique({ where: { id } });
      return Ok(row ? toEventRecord(row) : null);
    } catch (error) {
      return Err(UnexpectedDependencyError("Unable to read events."));
    }
  }

  async findAll(): Promise<Result<IEventRecord[], EventError>> {
    try {
      const rows = await this.prisma.event.findMany();
      return Ok(rows.map(toEventRecord));
    } catch (error) {
      return Err(UnexpectedDependencyError("Unable to list events."));
    }
  }

  async findByOrganizerId(organizerId: string): Promise<Result<IEventRecord[], EventError>> {
    try {
      const rows = await this.prisma.event.findMany({
        where: { organizerId },
      });
      return Ok(rows.map(toEventRecord));
    } catch (error) {
      return Err(UnexpectedDependencyError("Unable to list events for organizer."));
    }
  }

  async update(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const row = await this.prisma.event.update({
        where: { id: event.id },
        data: {
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          startDate: event.startDate,
          endDate: event.endDate,
          organizerId: event.organizerId,
          organizerName: event.organizerName,
          status: event.status,
          capacity: event.capacity,
          attendeeCount: event.attendeeCount,
          updatedAt: event.updatedAt,
        },
      });
      return Ok(toEventRecord(row));
    } catch (error) {
      return Err(UnexpectedDependencyError("Unable to update the event."));
    }
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma);
}
