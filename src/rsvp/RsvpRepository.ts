import type { Result } from "../lib/result";
import type { IRsvpRecord } from "./Rsvp";
import type { RsvpError } from "./errors";

export interface IRsvpRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<Result<IRsvpRecord | null, RsvpError>>;
  upsert(rsvp: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>>;
  countGoing(eventId: string): Promise<Result<number, RsvpError>>;
  listByUser(userId: string): Promise<Result<IRsvpRecord[], RsvpError>>;
  listByEvent(eventId: string): Promise<Result<IRsvpRecord[], RsvpError>>;
}