"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuthService = CreateAuthService;
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
const User_1 = require("./User");
class AuthService {
    users;
    passwordHasher;
    constructor(users, passwordHasher) {
        this.users = users;
        this.passwordHasher = passwordHasher;
    }
    async authenticate(input) {
        const email = input.email.trim().toLowerCase();
        const password = input.password;
        if (!email) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Email is required."));
        }
        if (!email.includes("@")) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Email must look like an email address."));
        }
        if (!password.trim()) {
            return (0, result_1.Err)((0, errors_1.ValidationError)("Password is required."));
        }
        const userResult = await this.users.findByEmail(email);
        if (userResult.ok === false) {
            const error = userResult.value;
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(error.message));
        }
        if (!userResult.value ||
            !this.passwordHasher.verify(password, userResult.value.passwordHash)) {
            return (0, result_1.Err)((0, errors_1.InvalidCredentials)("Invalid email or password."));
        }
        return (0, result_1.Ok)((0, User_1.toAuthenticatedUser)(userResult.value));
    }
}
function CreateAuthService(users, passwordHasher) {
    return new AuthService(users, passwordHasher);
}
