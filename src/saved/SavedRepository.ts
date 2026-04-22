import type { Result } from "../lib/result";
import type { ISavedEventRecord } from "./SavedEvent";

export type SavedError =
  | { name: "SavedEventNotFound"; message: string }
  | { name: "SavedNotAllowed"; message: string }
  | { name: "SavedInvalidEventState"; message: string }
  | { name: "SavedDependencyError"; message: string };

export interface ISavedRepository {
  findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<Result<ISavedEventRecord | null, SavedError>>;

  listByUser(
    userId: string,
  ): Promise<Result<ISavedEventRecord[], SavedError>>;

  create(
    record: ISavedEventRecord,
  ): Promise<Result<ISavedEventRecord, SavedError>>;

  remove(
    userId: string,
    eventId: string,
  ): Promise<Result<void, SavedError>>;
}