"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const composition_1 = require("../../src/composition");
function buildApp() {
    return (0, composition_1.createComposedApp)().getExpressApp();
}
async function loginAs(agent, email) {
    await agent.post("/login").send(`email=${email}&password=password123`);
}
describe("Feature 7 Sprint 2 - My RSVP Dashboard", () => {
    let app;
    let memberAgent;
    let staffAgent;
    beforeEach(async () => {
        app = buildApp();
        memberAgent = supertest_1.default.agent(app);
        staffAgent = supertest_1.default.agent(app);
        await loginAs(memberAgent, "user@app.test");
        await loginAs(staffAgent, "staff@app.test");
    });
    // --- Happy path ---
    it("redirects unauthenticated user", async () => {
        const res = await (0, supertest_1.default)(app).get("/rsvps/me");
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
