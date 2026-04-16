import type { SavedEvent } from "./SavedEvent";

export interface ISavedRepository {
  findByUserAndEvent(userId: string, eventId: string): Promise<SavedEvent | null>;
  save(userId: string, eventId: string): Promise<SavedEvent>;
  remove(userId: string, eventId: string): Promise<void>;
  listByUser(userId: string): Promise<SavedEvent[]>;
}