import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result";
import type { IEventRepository } from "../event/EventRepository";
import type { IRsvpRepository } from "./RsvpRepository";
import type { IToggleRsvpResult, IRsvpView } from "./Rsvp";
import {
  RsvpEventNotFound,
  RsvpNotAllowed,
  RsvpInvalidEventState,
  type RsvpError,
} from "./errors";
import type { IAuthenticatedUserSession } from "../session/AppSession";

export interface IRsvpService {
  toggleRsvp(
    eventId: string,
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IToggleRsvpResult, RsvpError>>;

  getRsvpView(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
    eventStatus: string,
    eventOrganizerId: string,
    eventCapacity: number,
  ): Promise<Result<IRsvpView, RsvpError>>;
}

class RsvpService implements IRsvpService {
  constructor(
    private readonly rsvpRepo: IRsvpRepository,
    private readonly eventRepo: IEventRepository,
  ) {}

  async toggleRsvp(
    eventId: string,
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IToggleRsvpResult, RsvpError>> {
    // 1. Load the event
    const eventResult = await this.eventRepo.findById(eventId);
    if (eventResult.ok === false) {
      return Err(RsvpEventNotFound("Event not found."));
    }
    const event = eventResult.value;
    if (!event) {
      return Err(RsvpEventNotFound("Event not found."));
    }

    // 2. Check event state — only published events accept RSVPs
    if (event.status !== "published") {
      return Err(RsvpInvalidEventState("You cannot RSVP to this event."));
    }

    // 3. Check role — only regular users (members) can RSVP
    if (currentUser.role === "admin" || currentUser.role === "staff") {
      return Err(RsvpNotAllowed("Organizers and admins cannot RSVP to events."));
    }

    // 4. Load existing RSVP (if any)
    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, currentUser.userId);
    if (existingResult.ok === false) {
      return Err(existingResult.value);
    }
    const existing = existingResult.value;

    // 5. Get current going count
    const countResult = await this.rsvpRepo.countGoing(eventId);
    if (countResult.ok === false) {
      return Err(countResult.value);
    }
    const goingCount = countResult.value;

    // 6. Determine the new status based on current state
    let newStatus: "going" | "waitlisted" | "cancelled";

    if (!existing) {
      // Case A: no RSVP yet — create new
      const isFull = event.capacity > 0 && goingCount >= event.capacity;
      newStatus = isFull ? "waitlisted" : "going";
    } else if (existing.status === "going" || existing.status === "waitlisted") {
      // Case B: currently active — cancel it
      newStatus = "cancelled";
    } else {
      // Case C: currently cancelled — reactivate
      const isFull = event.capacity > 0 && goingCount >= event.capacity;
      newStatus = isFull ? "waitlisted" : "going";
    }

    // 7. Save the RSVP
    const now = new Date().toISOString();
    const rsvpRecord = {
      id: existing?.id ?? randomUUID(),
      eventId,
      userId: currentUser.userId,
      status: newStatus,
      createdAt: existing?.createdAt ?? now,
    };

    const saveResult = await this.rsvpRepo.upsert(rsvpRecord);
    if (saveResult.ok === false) {
      return Err(saveResult.value);
    }

    // 8. Recount after the toggle
    const newCountResult = await this.rsvpRepo.countGoing(eventId);
    if (newCountResult.ok === false) {
      return Err(newCountResult.value);
    }
    const newGoingCount = newCountResult.value;

    // 9. Update attendeeCount on the event so A's UI stays in sync
    event.attendeeCount = newGoingCount;
    event.updatedAt = now;
    await this.eventRepo.update(event);

    return Ok({
      newStatus,
      goingCount: newGoingCount,
      capacity: event.capacity,
    });
  }

  async getRsvpView(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
    eventStatus: string,
    eventOrganizerId: string,
    eventCapacity: number,
  ): Promise<Result<IRsvpView, RsvpError>> {
    // If not logged in, or organizer/admin/staff, or event not published — can't RSVP
    if (
      !currentUser ||
      currentUser.role === "admin" ||
      currentUser.role === "staff" ||
      eventStatus !== "published"
    ) {
      const countResult = await this.rsvpRepo.countGoing(eventId);
      const goingCount = countResult.ok ? countResult.value : 0;

      return Ok({
        canRsvp: false,
        currentStatus: "none",
        goingCount,
        capacity: eventCapacity,
      });
    }

    // Load existing RSVP for this user
    const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, currentUser.userId);
    if (existingResult.ok === false) {
      return Err(existingResult.value);
    }

    const countResult = await this.rsvpRepo.countGoing(eventId);
    if (countResult.ok === false) {
      return Err(countResult.value);
    }

    return Ok({
      canRsvp: true,
      currentStatus: existingResult.value?.status ?? "none",
      goingCount: countResult.value,
      capacity: eventCapacity,
    });
  }
}

export function CreateRsvpService(
  rsvpRepo: IRsvpRepository,
  eventRepo: IEventRepository,
): IRsvpService {
  return new RsvpService(rsvpRepo, eventRepo);
}