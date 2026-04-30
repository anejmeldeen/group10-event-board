"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAdminUserService = CreateAdminUserService;
const node_crypto_1 = require("node:crypto");
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
const User_1 = require("./User");
class AdminUserService {
    users;
    passwordHasher;
    constructor(users, passwordHasher) {
        this.users = users;
        this.passwordHasher = passwordHasher;
    }
    async listUsers() {
        const result = await this.users.listUsers();
        if (result.ok === false) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(result.value.message));
        }
        return (0, result_1.Ok)(result.value.map(User_1.toUserSummary));
    }
    async createUser(input) {
        const email = input.email.trim().toLowerCase();
        const displayName = input.displayName.trim();
        const password = input.password;
        if (!displayName) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Display name is required."));
        }
        if (!email) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Email is required."));
        }
        if (!email.includes("@")) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Email must look like an email address."));
        }
        if (password.trim().length < 8) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Password must be at least 8 characters."));
        }
        const existingUser = await this.users.findByEmail(email);
        if (existingUser.ok === false) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(existingUser.value.message));
        }
        if (existingUser.value) {
            return (0, result_1.Err)((0, errors_1.UserAlreadyExists)("A user with that email already exists."));
        }
        const createResult = await this.users.createUser({
            id: (0, node_crypto_1.randomUUID)(),
            email,
            displayName,
            role: input.role,
            passwordHash: this.passwordHasher.hash(password),
        });
        if (createResult.ok === false) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(createResult.value.message));
        }
        return (0, result_1.Ok)((0, User_1.toUserSummary)(createResult.value));
    }
    async deleteUser(id, actingUserId) {
        if (!id.trim()) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("User ID is required."));
        }
        if (id === actingUserId) {
            return (0, result_1.Err)((0, errors_1.ProtectedUserOperation)("Admin users cannot remove their own account."));
        }
        const existingUser = await this.users.findById(id);
        if (existingUser.ok === false) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(existingUser.value.message));
        }
        if (!existingUser.value) {
            return (0, result_1.Err)((0, errors_1.UserNotFound)("User not found."));
        }
        const deleteResult = await this.users.deleteUser(id);
        if (deleteResult.ok === false) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(deleteResult.value.message));
        }
        if (!deleteResult.value) {
            return (0, result_1.Err)((0, errors_1.UserNotFound)("User not found."));
        }
        return (0, result_1.Ok)(undefined);
    }
}
function CreateAdminUserService(users, passwordHasher) {
    return new AdminUserService(users, passwordHasher);
}
