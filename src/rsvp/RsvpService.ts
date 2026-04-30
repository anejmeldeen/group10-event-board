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

import type { IEventRecord } from "../event/Event";

export interface IMyRsvpDashboardItem {
  eventId: string;
  title: string;
  location: string;
  category: string;
  startDate: string;
  endDate: string;
  eventStatus: string;
  rsvpStatus: "going" | "waitlisted" | "cancelled";
  organizerName: string;
}

export interface IMyRsvpDashboardData {
  upcoming: IMyRsvpDashboardItem[];
  history: IMyRsvpDashboardItem[];
}


export interface IRsvpService {
  toggleRsvp(
    eventId: string,
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<{ toggleResult: IToggleRsvpResult, event: IEventRecord }, RsvpError>>;

  getRsvpView(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
    event: IEventRecord,
  ): Promise<Result<IRsvpView, RsvpError>>;

  getMyRsvpDashboard(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IMyRsvpDashboardData, RsvpError>>;

  getUserRsvpStatuses(
    userId: string
  ): Promise<Result<Map<string, string>, RsvpError>>;
}

class RsvpService implements IRsvpService {
  constructor(
    private readonly rsvpRepo: IRsvpRepository,
    private readonly eventRepo: IEventRepository,
  ) {}

    async getMyRsvpDashboard(
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<IMyRsvpDashboardData, RsvpError>> {
    if (currentUser.role === "admin" || currentUser.role === "staff") {
      return Err(RsvpNotAllowed("Only members can access the RSVP dashboard."));
    }

    const rsvpResult = await this.rsvpRepo.listByUser(currentUser.userId);
    if (rsvpResult.ok === false) {
      return Err(rsvpResult.value);
    }

    const now = new Date();
    const upcoming: IMyRsvpDashboardItem[] = [];
    const history: IMyRsvpDashboardItem[] = [];

    for (const rsvp of rsvpResult.value) {
      const eventResult = await this.eventRepo.findById(rsvp.eventId);
      if (eventResult.ok === false) {
        return Err(RsvpEventNotFound("Event not found."));
      }

      const event = eventResult.value;
      if (!event) {
        return Err(RsvpEventNotFound("Event not found."));
      }

      const item: IMyRsvpDashboardItem = {
        eventId: event.id,
        title: event.title,
        location: event.location,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        eventStatus: event.status,
        rsvpStatus: rsvp.status,
        organizerName: event.organizerName,
      };

      const eventEnded = new Date(event.endDate) < now;
      const isHistory =
        event.status === "cancelled" ||
        eventEnded ||
        rsvp.status === "cancelled";

      if (isHistory) {
        history.push(item);
      } else {
        upcoming.push(item);
      }
    }

    upcoming.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    history.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

    return Ok({ upcoming, history });
  }

  async toggleRsvp(
    eventId: string,
    currentUser: IAuthenticatedUserSession,
  ): Promise<Result<{ toggleResult: IToggleRsvpResult, event: IEventRecord }, RsvpError>> {
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

    // 3.5. Check private event rules
    if (event.isPrivate) {
      if (!event.invitedEmails.some(e => e.toLowerCase() === currentUser.email.toLowerCase())) {
        return Err(RsvpNotAllowed("You are not invited to this private event."));
      }
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
      toggleResult: {
        newStatus,
        goingCount: newGoingCount,
        capacity: event.capacity,
      },
      event
    });
  }

  async getRsvpView(
    eventId: string,
    currentUser: IAuthenticatedUserSession | null,
    event: IEventRecord,
  ): Promise<Result<IRsvpView, RsvpError>> {
    // Check if private event rules fail first
    let isAllowed = true;
    if (event.isPrivate) {
      const isInvited = currentUser && event.invitedEmails.some(e => e.toLowerCase() === currentUser.email.toLowerCase());
      if (!isInvited) {
        isAllowed = false;
      }
    }

    // If not logged in, or organizer/admin/staff, or event not published — can't RSVP
    if (
      !isAllowed ||
      !currentUser ||
      currentUser.role === "admin" ||
      currentUser.role === "staff" ||
      event.status !== "published"
    ) {
      const countResult = await this.rsvpRepo.countGoing(eventId);
      const goingCount = countResult.ok ? countResult.value : 0;

      return Ok({
        canRsvp: false,
        currentStatus: "none" as const,
        goingCount,
        capacity: event.capacity,
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
      currentStatus: existingResult.value?.status ?? ("none" as const),
      goingCount: countResult.value,
      capacity: event.capacity,
    });
  }

  async getUserRsvpStatuses(
    userId: string
  ): Promise<Result<Map<string, string>, RsvpError>> {
    const rsvps = await this.rsvpRepo.listByUser(userId);
    if (rsvps.ok === false) return Err(rsvps.value);

    const map = new Map<string, string>();
    for (const rsvp of rsvps.value) {
      map.set(rsvp.eventId, rsvp.status);
    }
    return Ok(map);
  }
}

export function CreateRsvpService(
  rsvpRepo: IRsvpRepository,
  eventRepo: IEventRepository,
): IRsvpService {
  return new RsvpService(rsvpRepo, eventRepo);
}