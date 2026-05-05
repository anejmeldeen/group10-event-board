"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AdminUserService_1 = require("../../src/auth/AdminUserService");
const InMemoryUserRepository_1 = require("../../src/auth/InMemoryUserRepository");
const PasswordHasher_1 = require("../../src/auth/PasswordHasher");
describe("AdminUserService", () => {
    it("creates a new hashed user and lists it without exposing the password hash", async () => {
        const users = (0, InMemoryUserRepository_1.CreateInMemoryUserRepository)();
        const service = (0, AdminUserService_1.CreateAdminUserService)(users, (0, PasswordHasher_1.CreatePasswordHasher)());
        const created = await service.createUser({
            displayName: "Taylor Tester",
            email: "taylor@app.test",
            password: "password123",
            role: "staff",
        });
        expect(created.ok).toBe(true);
        if (created.ok) {
            expect(created.value.email).toBe("taylor@app.test");
            expect(created.value.role).toBe("staff");
            expect("passwordHash" in created.value).toBe(false);
        }
        const listed = await service.listUsers();
        expect(listed.ok).toBe(true);
        if (listed.ok) {
            expect(listed.value.some((user) => user.email === "taylor@app.test")).toBe(true);
        }
    });
    it("prevents the current admin from deleting their own account", async () => {
        const users = (0, InMemoryUserRepository_1.CreateInMemoryUserRepository)();
        const service = (0, AdminUserService_1.CreateAdminUserService)(users, (0, PasswordHasher_1.CreatePasswordHasher)());
        const result = await service.deleteUser("user-admin", "user-admin");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.value.message).toBe("Admin users cannot remove their own account.");
        }
    });
});
