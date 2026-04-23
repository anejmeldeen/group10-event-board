import { CreateRsvpService, type IRsvpService } from "../../src/rsvp/RsvpService";
import { CreateInMemoryRsvpRepository } from "../../src/rsvp/InMemoryRsvpRepository";
import { CreateInMemoryEventRepository } from "../../src/event/InMemoryEventRepository";
import type { IRsvpRepository } from "../../src/rsvp/RsvpRepository";
import type { IEventRepository } from "../../src/event/EventRepository";
import type { IAuthenticatedUserSession } from "../../src/session/AppSession";

async function seedEvent(repo: IEventRepository, overrides: Partial<import("../../src/event/Event").IEventRecord> = {}) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 86400000).toISOString();
  const event = {
    id: "evt-1",
    title: "Test Event",
    description: "A test event.",
    location: "Room 101",
    category: "workshop",
    status: "published" as const,
    capacity: 2,
    startDate: future,
    endDate: new Date(Date.now() + 90000000).toISOString(),
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await repo.create(event);
  return event;
}

function memberUser(overrides: Partial<IAuthenticatedUserSession> = {}): IAuthenticatedUserSession {
  return {
    userId: "user-reader",
    email: "user@app.test",
    displayName: "Una User",
    role: "user",
    signedInAt: new Date().toISOString(),
    ...overrides,
  };
}

function secondMember(): IAuthenticatedUserSession {
  return {
    userId: "user-reader-2",
    email: "user2@app.test",
    displayName: "Second User",
    role: "user",
    signedInAt: new Date().toISOString(),
  };
}

function thirdMember(): IAuthenticatedUserSession {
  return {
    userId: "user-reader-3",
    email: "user3@app.test",
    displayName: "Third User",
    role: "user",
    signedInAt: new Date().toISOString(),
  };
}

function staffUser(): IAuthenticatedUserSession {
  return {
    userId: "user-staff",
    email: "staff@app.test",
    displayName: "Sam Staff",
    role: "staff",
    signedInAt: new Date().toISOString(),
  };
}

function adminUser(): IAuthenticatedUserSession {
  return {
    userId: "user-admin",
    email: "admin@app.test",
    displayName: "Avery Admin",
    role: "admin",
    signedInAt: new Date().toISOString(),
  };
}

describe("RsvpService.toggleRsvp", () => {
  let eventRepo: IEventRepository;
  let rsvpRepo: IRsvpRepository;
  let service: IRsvpService;

  beforeEach(() => {
    eventRepo = CreateInMemoryEventRepository();
    rsvpRepo = CreateInMemoryRsvpRepository();
    service = CreateRsvpService(rsvpRepo, eventRepo);
  });

  // ── Happy path: new RSVP ────────────────────────────────────────

  it("creates a new RSVP with status going when event has capacity", async () => {
    await seedEvent(eventRepo);
    const result = await service.toggleRsvp("evt-1", memberUser());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newStatus).toBe("going");
      expect(result.value.goingCount).toBe(1);
    }
  });

  // ── Waitlist when full ──────────────────────────────────────────

  it("waitlists a member when event is at capacity", async () => {
    await seedEvent(eventRepo, { capacity: 1 });

    // First member fills the event
    await service.toggleRsvp("evt-1", memberUser());

    // Second member should be waitlisted
    const result = await service.toggleRsvp("evt-1", secondMember());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newStatus).toBe("waitlisted");
      expect(result.value.goingCount).toBe(1);
    }
  });

  // ── Unlimited capacity ─────────────────────────────────────────

  it("always gives going status when capacity is 0 (unlimited)", async () => {
    await seedEvent(eventRepo, { capacity: 0 });

    const r1 = await service.toggleRsvp("evt-1", memberUser());
    const r2 = await service.toggleRsvp("evt-1", secondMember());
    const r3 = await service.toggleRsvp("evt-1", thirdMember());

    expect(r1.ok && r1.value.newStatus).toBe("going");
    expect(r2.ok && r2.value.newStatus).toBe("going");
    expect(r3.ok && r3.value.newStatus).toBe("going");
  });

  // ── Toggle: active → cancelled ─────────────────────────────────

  it("cancels an active RSVP when toggled again", async () => {
    await seedEvent(eventRepo);
    await service.toggleRsvp("evt-1", memberUser());

    const result = await service.toggleRsvp("evt-1", memberUser());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newStatus).toBe("cancelled");
      expect(result.value.goingCount).toBe(0);
    }
  });

  // ── Toggle: cancelled → reactivated ────────────────────────────

  it("reactivates a cancelled RSVP as going when there is capacity", async () => {
    await seedEvent(eventRepo);

    // RSVP then cancel
    await service.toggleRsvp("evt-1", memberUser());
    await service.toggleRsvp("evt-1", memberUser());

    // Reactivate
    const result = await service.toggleRsvp("evt-1", memberUser());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newStatus).toBe("going");
      expect(result.value.goingCount).toBe(1);
    }
  });

  it("reactivates a cancelled RSVP as waitlisted when event is full", async () => {
    await seedEvent(eventRepo, { capacity: 1 });

    // First member RSVPs and cancels
    await service.toggleRsvp("evt-1", memberUser());
    await service.toggleRsvp("evt-1", memberUser());

    // Second member takes the spot
    await service.toggleRsvp("evt-1", secondMember());

    // First member tries to come back — event is full
    const result = await service.toggleRsvp("evt-1", memberUser());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newStatus).toBe("waitlisted");
    }
  });

  // ── Cancelling a waitlisted RSVP ───────────────────────────────

  it("cancels a waitlisted RSVP when toggled", async () => {
    await seedEvent(eventRepo, { capacity: 1 });

    await service.toggleRsvp("evt-1", memberUser());
    await service.toggleRsvp("evt-1", secondMember()); // waitlisted

    const result = await service.toggleRsvp("evt-1", secondMember()); // cancel waitlist

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newStatus).toBe("cancelled");
    }
  });

  // ── Going count accuracy ───────────────────────────────────────

  it("maintains accurate going count across multiple toggles", async () => {
    await seedEvent(eventRepo);

    await service.toggleRsvp("evt-1", memberUser());      // going (count: 1)
    await service.toggleRsvp("evt-1", secondMember());     // going (count: 2)
    await service.toggleRsvp("evt-1", memberUser());       // cancelled (count: 1)

    const result = await service.toggleRsvp("evt-1", thirdMember()); // going (count: 2)

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goingCount).toBe(2);
    }
  });

  // ── RsvpEventNotFound ──────────────────────────────────────────

  it("returns RsvpEventNotFound for a nonexistent event", async () => {
    const result = await service.toggleRsvp("does-not-exist", memberUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpEventNotFound");
    }
  });

  // ── RsvpNotAllowed ─────────────────────────────────────────────

  it("rejects RSVP from a staff user", async () => {
    await seedEvent(eventRepo);
    const result = await service.toggleRsvp("evt-1", staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowed");
    }
  });

  it("rejects RSVP from an admin", async () => {
    await seedEvent(eventRepo);
    const result = await service.toggleRsvp("evt-1", adminUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowed");
    }
  });

  // ── RsvpInvalidEventState ──────────────────────────────────────

  it("rejects RSVP to a draft event", async () => {
    await seedEvent(eventRepo, { status: "draft" });
    const result = await service.toggleRsvp("evt-1", memberUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpInvalidEventState");
    }
  });

  it("rejects RSVP to a cancelled event", async () => {
    await seedEvent(eventRepo, { status: "cancelled" });
    const result = await service.toggleRsvp("evt-1", memberUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpInvalidEventState");
    }
  });
});