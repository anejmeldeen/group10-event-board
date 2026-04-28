import { CreateEventService, type IEventService } from "../../src/event/EventService";
import { CreateInMemoryEventRepository } from "../../src/event/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "../../src/rsvp/InMemoryRsvpRepository";
import type { IEventRepository } from "../../src/event/EventRepository";
import type { IAuthenticatedUserSession } from "../../src/session/AppSession";

// Helper to create a test event directly in the repo
async function seedPublishedEvent(
  repo: IEventRepository,
  overrides: Partial<import("../../src/event/Event").IEventRecord> = {},
) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 86400000).toISOString();
  const event = {
    id: "evt-test-1",
    title: "Test Event",
    description: "A valid test event description.",
    location: "Room 101",
    category: "workshop",
    status: "published" as const,
    capacity: 30,
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

function staffUser(
  overrides: Partial<IAuthenticatedUserSession> = {},
): IAuthenticatedUserSession {
  return {
    userId: "user-staff",
    email: "staff@app.test",
    displayName: "Sam Staff",
    role: "staff",
    signedInAt: new Date().toISOString(),
    ...overrides,
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

function memberUser(): IAuthenticatedUserSession {
  return {
    userId: "user-reader",
    email: "user@app.test",
    displayName: "Una User",
    role: "user",
    signedInAt: new Date().toISOString(),
  };
}

function validInput() {
  const future = new Date(Date.now() + 86400000).toISOString();
  const laterFuture = new Date(Date.now() + 90000000).toISOString();
  return {
    title: "Updated Title",
    description: "Updated description that is long enough.",
    location: "New Room 202",
    category: "seminar",
    startDate: future,
    endDate: laterFuture,
    capacity: "50",
  };
}

describe("EventService.updateEvent", () => {
  let repo: IEventRepository;
  let service: IEventService;

  beforeEach(() => {
    repo = CreateInMemoryEventRepository();
    const rsvpRepo = CreateInMemoryRsvpRepository();
    service = CreateEventService(repo, rsvpRepo);
  });

  it("allows the organizer to edit their own published event", async () => {
    await seedPublishedEvent(repo);
    const result = await service.updateEvent("evt-test-1", validInput(), staffUser());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Updated Title");
      expect(result.value.location).toBe("New Room 202");
    }
  });

  it("allows an admin to edit any event", async () => {
    await seedPublishedEvent(repo);
    const result = await service.updateEvent("evt-test-1", validInput(), adminUser());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Updated Title");
    }
  });

  it("allows editing a draft event", async () => {
    await seedPublishedEvent(repo, { status: "draft" });
    const result = await service.updateEvent("evt-test-1", validInput(), staffUser());

    expect(result.ok).toBe(true);
  });

  it("returns EventNotFound for a nonexistent event", async () => {
    const result = await service.updateEvent("does-not-exist", validInput(), staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFound");
    }
  });

  it("rejects a staff user editing an event they do not own", async () => {
    await seedPublishedEvent(repo, { organizerId: "someone-else" });
    const result = await service.updateEvent("evt-test-1", validInput(), staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotAuthorized");
    }
  });

  it("rejects a member editing any event", async () => {
    await seedPublishedEvent(repo);
    const result = await service.updateEvent("evt-test-1", validInput(), memberUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotAuthorized");
    }
  });

  it("rejects editing a cancelled event", async () => {
    await seedPublishedEvent(repo, { status: "cancelled" });
    const result = await service.updateEvent("evt-test-1", validInput(), staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventInvalidState");
    }
  });

  it("rejects an empty title", async () => {
    await seedPublishedEvent(repo);
    const input = { ...validInput(), title: "" };
    const result = await service.updateEvent("evt-test-1", input, staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("MissingRequiredField");
      expect(result.value.message).toContain("Title");
    }
  });

  it("rejects a title that is too short", async () => {
    await seedPublishedEvent(repo);
    const input = { ...validInput(), title: "ab" };
    const result = await service.updateEvent("evt-test-1", input, staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("FieldTooShort");
    }
  });

  it("rejects an empty description", async () => {
    await seedPublishedEvent(repo);
    const input = { ...validInput(), description: "" };
    const result = await service.updateEvent("evt-test-1", input, staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("MissingRequiredField");
      expect(result.value.message).toContain("Description");
    }
  });

  it("rejects end date before start date", async () => {
    await seedPublishedEvent(repo);
    const input = {
      ...validInput(),
      startDate: new Date(Date.now() + 90000000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    };
    const result = await service.updateEvent("evt-test-1", input, staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EndBeforeStart");
      expect(result.value.message).toContain("End date");
    }
  });

  it("rejects negative capacity", async () => {
    await seedPublishedEvent(repo);
    const input = { ...validInput(), capacity: "-5" };
    const result = await service.updateEvent("evt-test-1", input, staffUser());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidCapacity");
    }
  });
});