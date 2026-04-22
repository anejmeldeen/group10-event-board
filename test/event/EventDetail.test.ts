/**
 * Integration tests for Event Detail Page (Feature 2, Sprint 2).
 *
 * Sprint 2 Requirements:
 *  - Define an error type for when an event is not found (EventNotFound is defined in errors.ts).
 *  - Write tests that cover published events, missing events, and the draft visibility rule from different user perspectives.
 */

import request from "supertest";
import { createComposedApp } from "../../src/composition";

function buildApp() {
  const app = createComposedApp();
  return app.getExpressApp();
}

async function loginAs(
  agent: request.Agent,
  email: string,
  password: string,
): Promise<void> {
  await agent.post("/login").send(`email=${email}&password=${password}`);
}

describe("GET /events/:id (Event Detail Page)", () => {
  let app: any;
  let adminAgent: request.Agent;
  let userAgent: request.Agent;
  let unauthorizedAgent: request.Agent;

  let publishedEventId: string;
  let draftEventId: string;
  let foreignDraftEventId: string;

  beforeAll(async () => {
    app = buildApp();

    // Set up agents
    adminAgent = request.agent(app);
    userAgent = request.agent(app);
    unauthorizedAgent = request.agent(app);

    await loginAs(adminAgent, "admin@app.test", "password123");
    await loginAs(userAgent, "user@app.test", "password123");
    // unauthorizedAgent remains unauthenticated

    // Create a published event by admin
    const publishedPayload = new URLSearchParams({
      title: "Published Test Event",
      description: "This is a detailed description of the published event.",
      location: "Main Hall",
      category: "Social",
      startDate: new Date(Date.now() + 86_400_000).toISOString(),
      endDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      capacity: "",
    }).toString();

    let res = await adminAgent
      .post("/events/create")
      .send(publishedPayload)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");
    
    // Publish the event just created. We have to parse the ID from the dashboard or mock it...
    // Since we don't know the ID dynamically just by creating it without parsing HTML,
    // let's do a quick regex on the home page to fish out the ID.
    const homeRes = await adminAgent.get("/home");
    const pubMatch = homeRes.text.match(/href="\/events\/([a-f0-9\-]+)"/i);
    // Find highest draft if multiple
    const ids = Array.from(homeRes.text.matchAll(/href="\/events\/([a-f0-9\-]+)"/gi)).map(m => m[1]);
    publishedEventId = ids[0]; // grab the most recently listed

    // Send publish request
    await adminAgent.post(`/events/${publishedEventId}/publish`).send();

    // Create a generic draft event by admin
    const draftPayload = new URLSearchParams({
      title: "Draft Test Event",
      description: "This is a draft event.",
      location: "Secret Room",
      category: "Internal",
      startDate: new Date(Date.now() + 86_400_000).toISOString(),
      endDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      capacity: "",
    }).toString();

    await adminAgent
      .post("/events/create")
      .send(draftPayload)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("HX-Request", "true");

    const homeRes2 = await adminAgent.get("/organizer/dashboard");
    const drafts = Array.from(homeRes2.text.matchAll(/href="\/events\/([a-f0-9\-]+)"/gi)).map(m => m[1]);
    // The previous publish removed publishedEventId from draft lists, so top draft is ours.
    draftEventId = drafts.find(id => id !== publishedEventId) || ids[1];
  });

  // 1. Missing Events
  it("returns 404 for a missing event", async () => {
    // Note: ID must look like a valid UUID mostly depending on how strict the app is,
    // but the backend will just yield 404 naturally since the repo won't find it.
    const res = await userAgent.get("/events/non-existent-id-0000");
    expect(res.status).toBe(404);
    expect(res.text).toContain("Event not found");
  });

  // 2. Published Events visibility
  it("allows any authenticated user to view published events", async () => {
    const res = await userAgent.get(`/events/${publishedEventId}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Published Test Event");
    expect(res.text).toContain("Main Hall");
  });

  it("blocks unauthenticated users from viewing published events", async () => {
    const res = await unauthorizedAgent.get(`/events/${publishedEventId}`);
    expect(res.status).toBe(302); // Redirect to login
  });

  // 3. Draft Rules
  it("allows the organizer who created it to view the draft", async () => {
    const res = await adminAgent.get(`/events/${draftEventId}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Draft Test Event");
  });

  it("prevents standard users from viewing draft events", async () => {
    const res = await userAgent.get(`/events/${draftEventId}`);
    expect(res.status).toBe(404); // Resolves as EventNotFound strictly for privacy
    expect(res.text).toContain("Event not found");
  });
});
