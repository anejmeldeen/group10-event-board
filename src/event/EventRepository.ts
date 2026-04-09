/**
 * Repository interface for event storage.
 *
 * All methods return Result<T, EventError> to keep error handling explicit.
 */

import type { Result } from "../lib/result";
import type { EventError } from "./errors";
import type { IEventRecord } from "./Event";

export interface IEventRepository {
  /** Persist a new event. */
  create(event: IEventRecord): Promise<Result<IEventRecord, EventError>>;

  /** Find a single event by its ID. Returns null if not found. */
  findById(id: string): Promise<Result<IEventRecord | null, EventError>>;

  /** Return all events (any status). */
  findAll(): Promise<Result<IEventRecord[], EventError>>;

  /** Return only events created by a specific organizer. */
  findByOrganizerId(organizerId: string): Promise<Result<IEventRecord[], EventError>>;
}
