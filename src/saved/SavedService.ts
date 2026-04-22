import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result";
import type { IEventRepository } from "../event/EventRepository";
import type { IAuthenticatedUserSession } from "../session/AppSession";
import type { ISavedRepository, SavedError } from "./SavedRepository";
import type { IEventRecord } from "../event/Event";

export interface ISavedService {
  toggleSavedEvent(
    eventId: string,
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<{ saved: boolean }, SavedError>>;

  getSavedEvents(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IEventRecord[], SavedError>>;

  getSavedEventIds(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<Set<string>, SavedError>>;
}

class SavedService implements ISavedService {
  constructor(
    private readonly savedRepo: ISavedRepository,
    private readonly eventRepo: IEventRepository,
  ) {}

  async toggleSavedEvent(
    eventId: string,
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<{ saved: boolean }, SavedError>> {
    if (currentUser.role === "admin" || currentUser.role === "staff") {
      return Err({
        name: "SavedNotAllowed" as const,
        message: "Only members can save events.",
      });
    }

    const eventResult = await this.eventRepo.findById(eventId);
    if (eventResult.ok === false) {
      return Err({
        name: "SavedDependencyError" as const,
        message: eventResult.value.message,
      });
    }

    const event = eventResult.value;
    if (!event) {
      return Err({
        name: "SavedEventNotFound" as const,
        message: "Event not found.",
      });
    }

    if (event.status !== "published") {
      return Err({
        name: "SavedInvalidEventState" as const,
        message: "Only published events can be saved.",
      });
    }

    const existingResult = await this.savedRepo.findByUserAndEvent(
      currentUser.userId,
      eventId,
    );
    if (existingResult.ok === false) {
      return Err(existingResult.value);
    }

    const existing = existingResult.value;

    if (existing) {
      const removeResult = await this.savedRepo.remove(currentUser.userId, eventId);
      if (removeResult.ok === false) {
        return Err(removeResult.value);
      }

      return Ok({ saved: false });
    }

    const createResult = await this.savedRepo.create({
      id: randomUUID(),
      userId: currentUser.userId,
      eventId,
      createdAt: new Date().toISOString(),
    });

    if (createResult.ok === false) {
      return Err(createResult.value);
    }

    return Ok({ saved: true });
  }

  async getSavedEvents(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IEventRecord[], SavedError>> {
    if (currentUser.role === "admin" || currentUser.role === "staff") {
      return Err({
        name: "SavedNotAllowed" as const,
        message: "Only members can access saved events.",
      });
    }

    const savedResult = await this.savedRepo.listByUser(currentUser.userId);
    if (savedResult.ok === false) {
      return Err(savedResult.value);
    }

    const events: IEventRecord[] = [];

    for (const saved of savedResult.value) {
      const eventResult = await this.eventRepo.findById(saved.eventId);
      if (eventResult.ok === false) {
        return Err({
          name: "SavedDependencyError" as const,
          message: eventResult.value.message,
        });
      }

      if (eventResult.value) {
        events.push(eventResult.value);
      }
    }

    events.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    return Ok(events);
  }

  async getSavedEventIds(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<Set<string>, SavedError>> {
    if (currentUser.role === "admin" || currentUser.role === "staff") {
      return Ok(new Set<string>());
    }

    const savedResult = await this.savedRepo.listByUser(currentUser.userId);
    if (savedResult.ok === false) {
      return Err(savedResult.value);
    }

    return Ok(new Set(savedResult.value.map((s) => s.eventId)));
  }
}

export function CreateSavedService(
  savedRepo: ISavedRepository,
  eventRepo: IEventRepository,
): ISavedService {
  return new SavedService(savedRepo, eventRepo);
}