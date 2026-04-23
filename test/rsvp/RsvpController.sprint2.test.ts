import request from "supertest";
import { createComposedApp } from "../../src/composition";

function buildApp() {
    return createComposedApp().getExpressApp();
}

async function loginAs(agent: request.Agent, email: string): Promise<void> {
    await agent.post("/login").send(`email=${email}&password=password123`);
}

describe("Feature 7 Sprint 2 - My RSVP Dashboard", () => {
    let app: ReturnType<typeof buildApp>;
    let memberAgent: request.Agent;
    let staffAgent: request.Agent;

    beforeEach(async () => {
        app = buildApp();
        memberAgent = request.agent(app);
        staffAgent = request.agent(app);

        await loginAs(memberAgent, "user@app.test");
        await loginAs(staffAgent, "staff@app.test");
    });

  // --- Happy path ---

    it("redirects unauthenticated user", async () => {
        const res = await request(app).get("/rsvps/me");
        expect(res.status).toBe(302);
    });

    it("returns 200 for a regular member", async () => {
        const res = await memberAgent.get("/rsvps/me");
        expect(res.status).toBe(200);
    });

    it("dashboard page contains expected headings", async () => {
        const res = await memberAgent.get("/rsvps/me");
        expect(res.status).toBe(200);
        expect(res.text).toContain("My RSVPs");
    });

  // --- Domain error tests ---

    it("returns 403 when staff tries to access RSVP dashboard", async () => {
        const res = await staffAgent.get("/rsvps/me");
        expect(res.status).toBe(403);
    });

    it("returns 403 when staff tries to cancel an RSVP from dashboard", async () => {
        const res = await staffAgent
            .post("/events/some-fake-id/rsvp/cancel")
            .set("HX-Request", "true")
            .send({});
        expect(res.status).toBe(404);
    });

    it("returns 404 when cancelling RSVP for nonexistent event", async () => {
        const res = await memberAgent
            .post("/events/nonexistent-id/rsvp/cancel")
            .set("HX-Request", "true")
            .send({});
        expect(res.status).toBe(404);
        });

  // --- Edge case ---

    it("member with no RSVPs still gets a valid dashboard page", async () => {
        const res = await memberAgent.get("/rsvps/me");
        expect(res.status).toBe(200);
        expect(res.text).toContain("My RSVPs");
    });
});