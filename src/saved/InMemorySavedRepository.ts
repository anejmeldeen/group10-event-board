import { Ok, Err, type Result } from "../lib/result";
import type { ISavedRepository, SavedError } from "./SavedRepository";
import type { ISavedEventRecord } from "./SavedEvent";

class InMemorySavedRepository implements ISavedRepository {
  private readonly records: ISavedEventRecord[] = [];

  async findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<Result<ISavedEventRecord | null, SavedError>> {
    try {
      const match =
        this.records.find((r) => r.userId === userId && r.eventId === eventId) ?? null;
      return Ok(match ? { ...match } : null);
    } catch {
      return Err({
        name: "SavedDependencyError" as const,
        message: "Unable to read saved events.",
      });
    }
  }

  async listByUser(
    userId: string,
  ): Promise<Result<ISavedEventRecord[], SavedError>> {
    try {
      return Ok(
        this.records
          .filter((r) => r.userId === userId)
          .map((r) => ({ ...r })),
      );
    } catch {
      return Err({
        name: "SavedDependencyError" as const,
        message: "Unable to list saved events.",
      });
    }
  }

  async create(
    record: ISavedEventRecord,
  ): Promise<Result<ISavedEventRecord, SavedError>> {
    try {
      this.records.push({ ...record });
      return Ok({ ...record });
    } catch {
      return Err({
        name: "SavedDependencyError" as const,
        message: "Unable to save this event.",
      });
    }
  }

  async remove(
    userId: string,
    eventId: string,
  ): Promise<Result<void, SavedError>> {
    try {
      const index = this.records.findIndex(
        (r) => r.userId === userId && r.eventId === eventId,
      );

      if (index >= 0) {
        this.records.splice(index, 1);
      }

      return Ok(undefined);
    } catch {
      return Err({
        name: "SavedDependencyError" as const,
        message: "Unable to remove saved event.",
      });
    }
  }
}

export function CreateInMemorySavedRepository(): ISavedRepository {
  return new InMemorySavedRepository();
}