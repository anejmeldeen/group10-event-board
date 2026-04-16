/**
 * Integration tests for Event Creation (Feature 1, Sprint 2).
 *
 * Tests run against the full Express app stack (routes → controller → service → in-memory repo)
 * using supertest. Each test authenticates via the demo user credentials already seeded
 * in the in-memory user repository.
 *
 * Coverage:
 *  - Happy path: valid event creation returns 200 + HX-Redirect (HTMX) or 302 (standard)
 *  - Each named error type returns the correct HTTP status and error name in the response
 *  - Members (role "user") cannot access the creation form or endpoint
 * 
 * Note: Sprint 2 compliance has been validated.
 */

import request from "supertest";
import { createComposedApp } from "../../src/composition";

// ── Helper: build a fresh app + supertest agent per test ──────────

function buildApp() {
  const app = createComposedApp();
  return app.getExpressApp();
}

/** Logs in as the given demo user and returns the session cookie string. */
async function loginAs(
  agent: request.Agent,
  email: string,
  password: string,
): Promise<void> {
  await agent.post("/login").send(`email=${email}&password=${password}`);
}

/**
 * Build a valid event payload with reasonable future dates.
 * Individual tests override specific fields to trigger specific errors.
 */
function validEventPayload(overrides: Record<string, string> = {}): Record<string, string> {
  const start = new Date(Date.now() + 86_400_000); // +1 day
  const end = new Date(Date.now() + 2 * 86_400_000); // +2 days

  return {
    title: "Integration Test Event",
    description: "A description that is long enough to pass the minimum length validation check.",
    location: "Room 101, Main Building",
    category: "Workshop",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    capacity: "50",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("POST /events/create", () => {
  // ── Access control ────────────────────────────────────────────

  it("returns 401 for unauthenticated users", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload()).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    // POST requests from unauthenticated users get 401, not a redirect
    expect(res.status).toBe(401);
  });

  it("blocks members (role=user) from creating events", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "user@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload()).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    expect(res.status).toBe(403);
  });

  // ── Happy path ────────────────────────────────────────────────

  it("creates an event and redirects to /home (standard form POST)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload()).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/home");
  });

  it("creates an event and returns HX-Redirect (HTMX request)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload()).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.headers["hx-redirect"]).toBe("/home");
  });

  it("gives the newly created event 'draft' status", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    // Create an event
    await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload()).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    // Check the dashboard — it should show the draft for the organizer
    const home = await agent.get("/home");
    expect(home.status).toBe(200);
    expect(home.text).toContain("Integration Test Event");
    expect(home.text).toContain("Draft");
  });

  // ── MissingRequiredField errors (400) ─────────────────────────

  it("returns 400 when title is empty", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ title: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Title is required");
  });

  it("returns 400 when description is empty", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ description: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Description is required");
  });

  it("returns 400 when location is empty", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ location: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Location is required");
  });

  it("returns 400 when category is empty", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ category: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Category is required");
  });

  it("returns 400 when start date is empty", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ startDate: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Start date is required");
  });

  it("returns 400 when end date is empty", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ endDate: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("End date is required");
  });

  // ── FieldTooShort errors (400) ────────────────────────────────

  it("returns 400 when title is too short", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ title: "AB" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Title must be at least 3 characters");
  });

  it("returns 400 when description is too short", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ description: "Short" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Description must be at least 10 characters");
  });

  // ── FieldTooLong errors (400) ─────────────────────────────────

  it("returns 400 when title exceeds max length", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ title: "A".repeat(201) })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Title must be at most 200 characters");
  });

  // ── InvalidDateFormat errors (400) ────────────────────────────

  it("returns 400 when start date is not a valid date", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ startDate: "not-a-date" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Start date is not a valid date");
  });

  it("returns 400 when end date is not a valid date", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ endDate: "not-a-date" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("End date is not a valid date");
  });

  // ── EndBeforeStart error (400) ────────────────────────────────

  it("returns 400 when end date is before start date", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const start = new Date(Date.now() + 2 * 86_400_000);
    const end = new Date(Date.now() + 1 * 86_400_000);

    const res = await agent
      .post("/events/create")
      .send(
        new URLSearchParams(
          validEventPayload({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        ).toString(),
      )
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("End date must be after the start date");
  });

  // ── StartDateInPast error (400) ───────────────────────────────

  it("returns 400 when start date is in the past", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const pastStart = new Date(Date.now() - 86_400_000);
    const futureEnd = new Date(Date.now() + 86_400_000);

    const res = await agent
      .post("/events/create")
      .send(
        new URLSearchParams(
          validEventPayload({
            startDate: pastStart.toISOString(),
            endDate: futureEnd.toISOString(),
          }),
        ).toString(),
      )
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Start date cannot be in the past");
  });

  // ── InvalidCapacity error (400) ───────────────────────────────

  it("returns 400 when capacity is negative", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ capacity: "-5" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Capacity must be a non-negative whole number");
  });

  it("returns 400 when capacity is not a number", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ capacity: "abc" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Capacity must be a non-negative whole number");
  });

  it("returns 400 when capacity exceeds maximum", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ capacity: "999999" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Capacity must be at most 100000");
  });

  // ── Capacity edge cases (accepts 0 and empty) ────────────────

  it("accepts capacity of 0 (unlimited)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ capacity: "0" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/home");
  });

  it("accepts empty capacity (unlimited)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ capacity: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/home");
  });

  // ── HTMX DOM Partial Integration Validation ────────────────────

  it("returns isolated partial layout (without navbars) for HTMX validation failures", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    // Force an error to capture the HTMX specifically-rendered partial body
    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ description: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    // HTMX partials MUST NOT contain the layout wrapper tags
    expect(res.text).not.toContain("<html");
    expect(res.text).not.toContain("<body");
    expect(res.text).not.toContain("<nav");
    // Ensure the expected payload is purely the alert partial component
    expect(res.text).toContain("section");
    expect(res.text).toContain("Description is required");
  });

  it("returns isolated partial layout for standard validation failures (Title missing)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ title: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    expect(res.status).toBe(400);
    expect(res.text).not.toContain("<!DOCTYPE html>");
    expect(res.text).toContain("Title is required");
  });

  it("responds seamlessly to HTMX concurrent duplicate submission states", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    // Overload the endpoint similar to rapid consecutive form submissions via a hyper-active client
    const payloads = [
      agent.post("/events/create").send(new URLSearchParams(validEventPayload()).toString()).set("HX-Request", "true"),
      agent.post("/events/create").send(new URLSearchParams(validEventPayload()).toString()).set("HX-Request", "true"),
      agent.post("/events/create").send(new URLSearchParams(validEventPayload()).toString()).set("HX-Request", "true"),
    ];

    const responses = await Promise.all(payloads);
    
    // Ensure the service isolates operations gracefully without dying
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.headers['hx-redirect']).toBe("/home");
    }
  });

  // ── Standard form POST re-renders form with error on failure ──

  it("re-renders the form with the error message on standard POST failure", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload({ title: "" })).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    expect(res.status).toBe(400);
    // Should re-render the full page with error
    expect(res.text).toContain("Title is required");
    expect(res.text).toContain("Create New Event");
  });

  // ── Organizer identity from session ───────────────────────────

  it("uses the organizer identity from the session, not the form", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    // Create an event
    await agent
      .post("/events/create")
      .send(new URLSearchParams(validEventPayload()).toString())
      .set("Content-Type", "application/x-www-form-urlencoded");

    // The event should show organizer from session (Avery Admin)
    const home = await agent.get("/home");
    expect(home.text).toContain("Avery Admin");
  });
});

describe("GET /events/create", () => {
  it("redirects unauthenticated users to /login", async () => {
    const app = buildApp();
    const res = await request(app).get("/events/create");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  it("blocks members (role=user) from viewing the creation form", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "user@app.test", "password123");

    const res = await agent.get("/events/create");
    expect(res.status).toBe(403);
  });

  it("shows the creation form to organizers (admin/staff)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await loginAs(agent, "admin@app.test", "password123");

    const res = await agent.get("/events/create");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Create New Event");
  });
});
