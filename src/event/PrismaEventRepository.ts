import { PrismaClient } from ".prisma/client/default";
import { Ok, Err, type Result } from "../lib/result";
import { UnexpectedDependencyError, type EventError } from "./errors";
import type { IEventRepository } from "./EventRepository";
import type { IEventRecord } from "./Event";

class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const created = await this.prisma.event.create({ data: event });
      return Ok(created as IEventRecord);
    } catch (e) {
      return Err(UnexpectedDependencyError(`Failed to create event: ${e}`));
    }
  }

  async findById(id: string): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { id } });
      return Ok(event as IEventRecord | null);
    } catch (e) {
      return Err(UnexpectedDependencyError(`Failed to find event: ${e}`));
    }
  }

  async findAll(): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await this.prisma.event.findMany();
      return Ok(events as IEventRecord[]);
    } catch (e) {
      return Err(UnexpectedDependencyError(`Failed to list events: ${e}`));
    }
  }

  async findByOrganizerId(organizerId: string): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await this.prisma.event.findMany({ where: { organizerId } });
      return Ok(events as IEventRecord[]);
    } catch (e) {
      return Err(UnexpectedDependencyError(`Failed to list events for organizer: ${e}`));
    }
  }

  async update(event: IEventRecord): Promise<Result<IEventRecord, EventError>> {
    try {
      const updated = await this.prisma.event.update({
        where: { id: event.id },
        data: event,
      });
      return Ok(updated as IEventRecord);
    } catch (e) {
      return Err(UnexpectedDependencyError(`Failed to update event: ${e}`));
    }
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma);
}