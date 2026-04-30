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
describe("Feature 8 Sprint 2 - Organizer Dashboard", () => {
    let app;
    let adminAgent;
    let staffAgent;
    let memberAgent;
    beforeEach(async () => {
        app = buildApp();
        adminAgent = supertest_1.default.agent(app);
        staffAgent = supertest_1.default.agent(app);
        memberAgent = supertest_1.default.agent(app);
        await loginAs(adminAgent, "admin@app.test");
        await loginAs(staffAgent, "staff@app.test");
        await loginAs(memberAgent, "user@app.test");
    });
    // --- Happy path ---
    it("redirects unauthenticated user", async () => {
        const res = await (0, supertest_1.default)(app).get("/events/manage");
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
