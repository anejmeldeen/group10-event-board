import request from "supertest";
import { createComposedApp } from "../../src/composition";

function buildApp() {
    return createComposedApp().getExpressApp();
}

async function loginAs(agent: request.Agent, email: string): Promise<void> {
    await agent.post("/login").send(`email=${email}&password=password123`);
}

describe("Feature 8 Sprint 2 - Organizer Dashboard", () => {
    let app: ReturnType<typeof buildApp>;
    let adminAgent: request.Agent;
    let staffAgent: request.Agent;
    let memberAgent: request.Agent;

    beforeEach(async () => {
        app = buildApp();
        adminAgent = request.agent(app);
        staffAgent = request.agent(app);
        memberAgent = request.agent(app);

        await loginAs(adminAgent, "admin@app.test");
        await loginAs(staffAgent, "staff@app.test");
        await loginAs(memberAgent, "user@app.test");
    });

  // --- Happy path ---

    it("redirects unauthenticated user", async () => {
        const res = await request(app).get("/events/manage");
        expect(res.status).toBe(302);
    });

    it("returns 200 for an admin", async () => {
        const res = await adminAgent.get("/events/manage");
        expect(res.status).toBe(200);
    });

    it("returns 200 for a staff organizer", async () => {
        const res = await staffAgent.get("/events/manage");
        expect(res.status).toBe(200);
    });

    it("dashboard page contains expected section headings", async () => {
        const res = await adminAgent.get("/events/manage");
        expect(res.status).toBe(200);
        expect(res.text).toContain("Organizer Dashboard");
        expect(res.text).toContain("Create Event");
    });

  // --- Domain error tests ---

    it("returns 403 for a regular member", async () => {
        const res = await memberAgent.get("/events/manage");
        expect(res.status).toBe(403);
    });

    it("returns 403 when member tries to publish an event", async () => {
    const res = await memberAgent
        .post("/events/some-fake-id/publish")
        .type("form")
        .send({});
    expect(res.status).toBe(403);
    });

    it("returns 404 when publishing a nonexistent event", async () => {
        const res = await adminAgent
            .post("/events/nonexistent-id/publish")
            .type("form")
            .send({});
        expect(res.status).toBe(404);
    });

  // --- Edge case ---

    it("staff with no events still gets a valid dashboard page", async () => {
        const res = await staffAgent.get("/events/manage");
        expect(res.status).toBe(200);
        expect(res.text).toContain("Dashboard");
    });
});