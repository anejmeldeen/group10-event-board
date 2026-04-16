import { Err, Ok, type Result } from "../lib/result";
import {
  findEventBoardItemById,
  getAllEventBoardItems,
  type EventBoardItem,
} from "../search/EventBoardData";
import type { ISavedRepository } from "./SavedRepository";

type SavedError =
  | { name: "ForbiddenRole"; message: string }
  | { name: "EventNotFound"; message: string }
  | { name: "InvalidEventState"; message: string };

export interface ISavedService {
  toggleSavedEvent(
    userId: string,
    role: string,
    eventId: string,
  ): Promise<Result<{ saved: boolean }, SavedError>>;

  listSavedEvents(
    userId: string,
    role: string,
  ): Promise<Result<EventBoardItem[], SavedError>>;
}

export function CreateSavedService(
  savedRepository: ISavedRepository,
): ISavedService {
  return {
    async toggleSavedEvent(
      userId: string,
      role: string,
      eventId: string,
    ): Promise<Result<{ saved: boolean }, SavedError>> {
      if (role !== "user") {
        return Err<SavedError>({
          name: "ForbiddenRole",
          message: "Only members can save events.",
        });
      }

      const event = findEventBoardItemById(eventId);

      if (!event) {
        return Err<SavedError>({
          name: "EventNotFound",
          message: "Event not found.",
        });
      }

      if (event.status === "cancelled" || event.status === "past") {
        return Err<SavedError>({
          name: "InvalidEventState",
          message: "You cannot save cancelled or past events.",
        });
      }

      const existing = await savedRepository.findByUserAndEvent(userId, eventId);

      if (existing) {
        await savedRepository.remove(userId, eventId);
        return Ok({ saved: false });
      }

      await savedRepository.save(userId, eventId);
      return Ok({ saved: true });
    },

    async listSavedEvents(
      userId: string,
      role: string,
    ): Promise<Result<EventBoardItem[], SavedError>> {
      if (role !== "user") {
        return Err<SavedError>({
          name: "ForbiddenRole",
          message: "Only members have a saved events list.",
        });
      }

      const savedItems = await savedRepository.listByUser(userId);
      const events = getAllEventBoardItems();

      const savedEvents = savedItems
        .map((saved) => events.find((event) => event.id === saved.eventId))
        .filter((event): event is EventBoardItem => event !== undefined);

      return Ok(savedEvents);
    },
  };
}