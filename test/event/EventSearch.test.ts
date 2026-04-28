import request from "supertest";
import { createComposedApp } from "../../src/composition";

describe("Event search", () => {
  it("returns the home page for empty query", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@app.test", password: "password123" });

    const createEvent = async (title: string, description: string, location: string) => {
      const start = new Date(Date.now() + 86400000).toISOString();
      const end = new Date(Date.now() + 90000000).toISOString();

      await agent
        .post("/events/create")
        .type("form")
        .send({
          title,
          description,
          location,
          category: "social",
          startDate: start,
          endDate: end,
          capacity: "20",
        });

      const homeRes = await agent.get("/home");
      const match = homeRes.text.match(/\/events\/([a-f0-9-]+)\/publish/);
      if (!match) throw new Error("Could not find created draft event id.");

      await agent.post(`/events/${match[1]}/publish`).type("form").send({});
    };

    await createEvent("Farmers Market Friday", "Fresh produce and local vendors", "Town Common");
    await createEvent("JavaScript Study Jam", "Group study session in the library", "Campus Library");

    const response = await agent.get("/home?q=");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Farmers Market Friday");
    expect(response.text).toContain("JavaScript Study Jam");
  });

  it("filters matching results", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@app.test", password: "password123" });

    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();

    await agent.post("/events/create").type("form").send({
      title: "Farmers Market Friday",
      description: "Fresh produce and local vendors",
      location: "Town Common",
      category: "social",
      startDate: start,
      endDate: end,
      capacity: "20",
    });

    let homeRes = await agent.get("/home");
    let match = homeRes.text.match(/\/events\/([a-f0-9-]+)\/publish/);
    if (!match) throw new Error("Could not find first draft event id.");
    await agent.post(`/events/${match[1]}/publish`).type("form").send({});

    await agent.post("/events/create").type("form").send({
      title: "JavaScript Study Jam",
      description: "Group study session in the library",
      location: "Campus Library",
      category: "educational",
      startDate: start,
      endDate: end,
      capacity: "20",
    });

    homeRes = await agent.get("/home");
    const matches = [...homeRes.text.matchAll(/\/events\/([a-f0-9-]+)\/publish/g)];
    const secondId = matches[matches.length - 1]?.[1];
    if (!secondId) throw new Error("Could not find second draft event id.");
    await agent.post(`/events/${secondId}/publish`).type("form").send({});

    const response = await agent.get("/home?q=market");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Farmers Market Friday");
    expect(response.text).not.toContain("JavaScript Study Jam");
  });

  it("returns no results when nothing matches", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@app.test", password: "password123" });

    const response = await agent.get("/home?q=zzzzzz");

    expect(response.status).toBe(200);
    expect(response.text).toContain("No events found");
  });

  it("rejects an invalid search query that is too long", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@app.test", password: "password123" });

    const response = await agent.get(`/home?q=${"a".repeat(101)}`);

    expect(response.status).toBe(400);
    expect(response.text).toContain("Search query must be at most 100 characters.");
  });

  it("returns partial HTML for HTMX search requests", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({ email: "admin@app.test", password: "password123" });

    const response = await agent.get("/home?q=").set("HX-Request", "true");

    expect(response.status).toBe(200);
    expect(response.text).not.toContain("<html");
  });
});