import type { ISavedRepository } from "./SavedRepository";
import type { SavedEvent } from "./SavedEvent";

export function CreateInMemorySavedRepository(): ISavedRepository {
  const savedEvents: SavedEvent[] = [];

  return {
    async findByUserAndEvent(userId: string, eventId: string): Promise<SavedEvent | null> {
      return savedEvents.find(
        (saved) => saved.userId === userId && saved.eventId === eventId,
      ) ?? null;
    },

    async save(userId: string, eventId: string): Promise<SavedEvent> {
      const saved: SavedEvent = {
        userId,
        eventId,
        savedAt: new Date(),
      };
      savedEvents.push(saved);
      return saved;
    },

    async remove(userId: string, eventId: string): Promise<void> {
      const index = savedEvents.findIndex(
        (saved) => saved.userId === userId && saved.eventId === eventId,
      );

      if (index >= 0) {
        savedEvents.splice(index, 1);
      }
    },

    async listByUser(userId: string): Promise<SavedEvent[]> {
      return savedEvents.filter((saved) => saved.userId === userId);
    },
  };
}