// STUB — owned by Feature 1 (Teammate A).
// Delete and use A's version once F1 is merged to dev.

import type { Result } from "../lib/result";
import type { IEventRecord } from "./Event";
import type { EventError } from "./errors";

export interface IEventRepository {
  findById(id: string): Promise<Result<IEventRecord | null, EventError>>;
  listAll(): Promise<Result<IEventRecord[], EventError>>;
  create(event: IEventRecord): Promise<Result<IEventRecord, EventError>>;
  update(event: IEventRecord): Promise<Result<IEventRecord, EventError>>;
}