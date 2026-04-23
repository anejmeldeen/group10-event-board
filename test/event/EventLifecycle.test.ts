import { Ok } from "../../src/lib/result";
import { CreateEventService } from "../../src/event/EventService";
import { CreateInMemoryEventRepository } from "../../src/event/InMemoryEventRepository";
import type { IEventRecord } from "../../src/event/Event";
import type { IAuthenticatedUserSession } from "../../src/session/AppSession";
import type { IRsvpRepository } from "../../src/rsvp/RsvpRepository";

describe("Feature 5 lifecycle transitions", () => {
  const organizer: IAuthenticatedUserSession = {
    userId: "organizer-1",
    email: "organizer@example.com",
    displayName: "Organizer One",
    role: "staff",
    signedInAt: new Date().toISOString(),
  };

  const otherStaff: IAuthenticatedUserSession = {
    userId: "staff-2",
    email: "staff2@example.com",
    displayName: "Other Staff",
    role: "staff",
    signedInAt: new Date().toISOString(),
  };

  const admin: IAuthenticatedUserSession = {
    userId: "admin-1",
    email: "admin@example.com",
    displayName: "Admin User",
    role: "admin",
    signedInAt: new Date().toISOString(),
  };

  function makeRsvpRepo(): IRsvpRepository {
    const repo: Pick<IRsvpRepository, "countGoing"> = {
      countGoing: async () => Ok(0),
    };

    return repo as unknown as IRsvpRepository;
  }

  function makeEvent(overrides: Partial<IEventRecord> = {}): IEventRecord {
    const now = new Date().toISOString();

    return {
      id: overrides.id ?? "event-1",
      title: overrides.title ?? "Test Event",
      description: overrides.description ?? "This is a valid test event description.",
      location: overrides.location ?? "Campus Center",
      category: overrides.category ?? "Social",
      startDate: overrides.startDate ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      endDate: overrides.endDate ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      organizerId: overrides.organizerId ?? organizer.userId,
      organizerName: overrides.organizerName ?? organizer.displayName,
      status: overrides.status ?? "draft",
      capacity: overrides.capacity ?? 10,
      attendeeCount: overrides.attendeeCount ?? 0,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };
  }

  test("organizer can publish a draft event", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(makeEvent({ id: "publish-draft", status: "draft" }));

    const result = await service.publishEvent("publish-draft", organizer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("published");
    }
  });

  test("organizer cannot publish an already published event", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(makeEvent({ id: "already-published", status: "published" }));

    const result = await service.publishEvent("already-published", organizer);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventInvalidState");
      expect(result.value.message).toBe("Only draft events can be published.");
    }
  });

  test("organizer can cancel a published event", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(makeEvent({ id: "cancel-published", status: "published" }));

    const result = await service.cancelEvent("cancel-published", organizer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
    }
  });

  test("organizer cannot cancel a draft event", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(makeEvent({ id: "cancel-draft", status: "draft" }));

    const result = await service.cancelEvent("cancel-draft", organizer);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventInvalidState");
      expect(result.value.message).toBe("Only published events can be cancelled.");
    }
  });

  test("non-owner cannot publish another user's draft event", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(
      makeEvent({
        id: "other-users-draft",
        status: "draft",
        organizerId: "different-organizer",
        organizerName: "Different Organizer",
      }),
    );

    const result = await service.publishEvent("other-users-draft", otherStaff);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotAuthorized");
    }
  });

  test("admin can cancel any published event", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(
      makeEvent({
        id: "admin-cancel",
        status: "published",
        organizerId: "different-organizer",
        organizerName: "Different Organizer",
      }),
    );

    const result = await service.cancelEvent("admin-cancel", admin);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("cancelled");
    }
  });

  test("missing event returns EventNotFound", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    const result = await service.publishEvent("missing-event", organizer);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFound");
    }
  });
});