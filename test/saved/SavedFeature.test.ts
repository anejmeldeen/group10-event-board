import request from "supertest";
import { createComposedApp } from "../../src/composition";

describe("Saved events feature", () => {
  async function loginAsAdmin(agent: any) {
    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@app.test", password: "password123" });
  }

  async function loginAsUser(agent: any) {
    await agent
      .post("/login")
      .type("form")
      .send({ email: "user@app.test", password: "password123" });
  }

  async function createPublishedEvent(agent: any, title = "Saved Test Event") {
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();

    await agent
      .post("/events/create")
      .type("form")
      .send({
        title,
        description: "A valid description long enough for saving tests.",
        location: "Campus Center",
        category: "social",
        startDate: start,
        endDate: end,
        capacity: "25",
      });

    const homeRes = await agent.get("/home");
    const match = homeRes.text.match(/\/events\/([a-f0-9-]+)\/publish/);
    if (!match) {
      throw new Error("Could not find created draft event id.");
    }

    const eventId = match[1];
    await agent.post(`/events/${eventId}/publish`).type("form").send({});
    return eventId;
  }

  it("allows a member to save and unsave an event", async () => {
    const app = createComposedApp().getExpressApp();
    const adminAgent = request.agent(app);
    const userAgent = request.agent(app);

    await loginAsAdmin(adminAgent);
    const eventId = await createPublishedEvent(adminAgent);

    await loginAsUser(userAgent);

    const saveRes = await userAgent
      .post(`/saved/${eventId}/toggle`)
      .type("form")
      .send({ returnTo: "/saved", context: "saved" });

    expect(saveRes.status).toBe(302);

    const savedPage = await userAgent.get("/saved");
    expect(savedPage.status).toBe(200);
    expect(savedPage.text).toContain("Saved Test Event");

    const unsaveRes = await userAgent
      .post(`/saved/${eventId}/toggle`)
      .type("form")
      .send({ returnTo: "/saved", context: "saved" });

    expect(unsaveRes.status).toBe(302);

    const savedPageAfter = await userAgent.get("/saved");
    expect(savedPageAfter.text).not.toContain("Saved Test Event");
  });

  it("shows saved list contents for the member", async () => {
    const app = createComposedApp().getExpressApp();
    const adminAgent = request.agent(app);
    const userAgent = request.agent(app);

    await loginAsAdmin(adminAgent);
    const eventId = await createPublishedEvent(adminAgent, "Movie Night");

    await loginAsUser(userAgent);
    await userAgent
      .post(`/saved/${eventId}/toggle`)
      .type("form")
      .send({ returnTo: "/saved", context: "saved" });

    const response = await userAgent.get("/saved");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Movie Night");
    expect(response.text).toContain("Remove Saved Event");
  });

  it("rejects admin from saving an event", async () => {
    const app = createComposedApp().getExpressApp();
    const adminAgent = request.agent(app);

    await loginAsAdmin(adminAgent);
    const eventId = await createPublishedEvent(adminAgent, "Admin Cannot Save");

    const response = await adminAgent
      .post(`/saved/${eventId}/toggle`)
      .type("form")
      .send({ returnTo: "/home", context: "home" });

    expect(response.status).toBe(403);
    expect(response.text).toContain("Only members can save events.");
  });

  it("rejects saving a draft event", async () => {
    const app = createComposedApp().getExpressApp();
    const adminAgent = request.agent(app);
    const userAgent = request.agent(app);

    await loginAsAdmin(adminAgent);

    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();

    await adminAgent
      .post("/events/create")
      .type("form")
      .send({
        title: "Draft Only Event",
        description: "A valid description long enough for draft testing.",
        location: "Library",
        category: "academic",
        startDate: start,
        endDate: end,
        capacity: "10",
      });

    const homeRes = await adminAgent.get("/home");
    const match = homeRes.text.match(/\/events\/([a-f0-9-]+)\/publish/);
    if (!match) {
      throw new Error("Could not find created draft event id.");
    }

    const eventId = match[1];

    await loginAsUser(userAgent);

    const response = await userAgent
      .post(`/saved/${eventId}/toggle`)
      .type("form")
      .send({ returnTo: "/home", context: "home" });

    expect(response.status).toBe(409);
    expect(response.text).toContain("Only published events can be saved.");
  });

  it("returns a partial fragment for HTMX save toggle", async () => {
    const app = createComposedApp().getExpressApp();
    const adminAgent = request.agent(app);
    const userAgent = request.agent(app);

    await loginAsAdmin(adminAgent);
    const eventId = await createPublishedEvent(adminAgent, "HTMX Saved Event");

    await loginAsUser(userAgent);

    const response = await userAgent
      .post(`/saved/${eventId}/toggle`)
      .set("HX-Request", "true")
      .type("form")
      .send({ returnTo: "/home", context: "home" });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Saved");
    expect(response.text).not.toContain("<html");
  });
});