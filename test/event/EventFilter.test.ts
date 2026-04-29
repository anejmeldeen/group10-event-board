import { Ok } from "../../src/lib/result";
import { CreateEventService } from "../../src/event/EventService";
import { CreateInMemoryEventRepository } from "../../src/event/InMemoryEventRepository";
import type { IEventRecord } from "../../src/event/Event";
import type { IRsvpRepository } from "../../src/rsvp/RsvpRepository";

describe("Feature 6 filtering", () => {
  function makeRsvpRepo(): IRsvpRepository {
    return {
      countGoing: async () => Ok(0),
    } as unknown as IRsvpRepository;
  }

  function makeEvent(overrides: Partial<IEventRecord> = {}): IEventRecord {
    const now = new Date().toISOString();

    return {
      id: overrides.id ?? "event-1",
      title: overrides.title ?? "Test Event",
      description: overrides.description ?? "This is a valid event description.",
      location: overrides.location ?? "Campus Center",
      category: overrides.category ?? "social",
      startDate: overrides.startDate ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: overrides.endDate ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      organizerId: overrides.organizerId ?? "staff-1",
      organizerName: overrides.organizerName ?? "Organizer",
      status: overrides.status ?? "published",
      capacity: overrides.capacity ?? 10,
      attendeeCount: overrides.attendeeCount ?? 0,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };
  }

  test("returns published upcoming events with no filters", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(makeEvent({ id: "published-1", status: "published" }));
    await repo.create(makeEvent({ id: "draft-1", status: "draft" }));
    await repo.create(
      makeEvent({
        id: "past-1",
        status: "published",
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      }),
    );

    const result = await service.listVisibleEvents(null, "", "", "");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((e) => e.id)).toEqual(["published-1"]);
    }
  });

  test("filters by category", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(makeEvent({ id: "social-1", category: "social" }));
    await repo.create(makeEvent({ id: "sports-1", category: "sports" }));

    const result = await service.listVisibleEvents(null, "", "sports", "");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe("sports-1");
    }
  });

  test("filters by category and search query together", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    await repo.create(
      makeEvent({
        id: "sports-match",
        category: "sports",
        title: "Football Match",
      }),
    );
    await repo.create(
      makeEvent({
        id: "sports-practice",
        category: "sports",
        title: "Basketball Practice",
      }),
    );

    const result = await service.listVisibleEvents(null, "football", "sports", "");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe("sports-match");
    }
  });

  test("returns ValidationError for invalid category filter", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    const result = await service.listVisibleEvents(null, "", "invalid-category", "");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("ValidationError");
      expect(result.value.field).toBe("category");
    }
  });

  test("returns ValidationError for invalid timeframe filter", async () => {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo, makeRsvpRepo());

    const result = await service.listVisibleEvents(null, "", "", "next-month");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("ValidationError");
      expect(result.value.field).toBe("timeframe");
    }
  });
});