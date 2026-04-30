import { Ok, Err, type Result } from "../lib/result";
import type { ISavedRepository, SavedError } from "./SavedRepository";
import type { ISavedEventRecord } from "./SavedEvent";
import { PrismaClient } from "@prisma/client";

function toSavedEventRecord(record: any): ISavedEventRecord {
  return {
    id: record.id,
    userId: record.userId,
    eventId: record.eventId,
    createdAt: record.createdAt,
  };
}

class PrismaSavedRepository implements ISavedRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<Result<ISavedEventRecord | null, SavedError>> {
    try {
      const record = await this.prisma.savedEvent.findFirst({
        where: {
          userId,
          eventId,
        },
      });

      return Ok(record ? toSavedEventRecord(record) : null);
    } catch (e: any) {
      return Err({
        name: "SavedDependencyError" as const,
        message: `Unable to read saved events: ${e?.message ?? String(e)}`,
      });
    }
  }

  async listByUser(
    userId: string,
  ): Promise<Result<ISavedEventRecord[], SavedError>> {
    try {
      const records = await this.prisma.savedEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });

      return Ok(records.map(toSavedEventRecord));
    } catch (e: any) {
      return Err({
        name: "SavedDependencyError" as const,
        message: `Unable to list saved events: ${e?.message ?? String(e)}`,
      });
    }
  }

  async create(
    record: ISavedEventRecord,
  ): Promise<Result<ISavedEventRecord, SavedError>> {
    try {
      const created = await this.prisma.savedEvent.create({
        data: {
          id: record.id,
          userId: record.userId,
          eventId: record.eventId,
          createdAt: record.createdAt,
        },
      });

      return Ok(toSavedEventRecord(created));
    } catch (e: any) {
      return Err({
        name: "SavedDependencyError" as const,
        message: `Unable to save this event: ${e?.message ?? String(e)}`,
      });
    }
  }

  async remove(
    userId: string,
    eventId: string,
  ): Promise<Result<void, SavedError>> {
    try {
      await this.prisma.savedEvent.deleteMany({
        where: {
          userId,
          eventId,
        },
      });

      return Ok(undefined);
    } catch (e: any) {
      return Err({
        name: "SavedDependencyError" as const,
        message: `Unable to remove saved event: ${e?.message ?? String(e)}`,
      });
    }
  }
}

export function CreatePrismaSavedRepository(prisma: PrismaClient): ISavedRepository {
  return new PrismaSavedRepository(prisma);
}