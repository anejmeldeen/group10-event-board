"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuthController = CreateAuthController;
const AppSession_1 = require("../session/AppSession");
class AuthController {
    service;
    adminUsers;
    logger;
    constructor(service, adminUsers, logger) {
        this.service = service;
        this.adminUsers = adminUsers;
        this.logger = logger;
    }
    mapErrorStatus(error) {
        if (error.name === "InvalidCredentials")
            return 401;
        if (error.name === "AuthorizationRequired")
            return 403;
        if (error.name === "UserNotFound")
            return 404;
        if (error.name === "UserAlreadyExists")
            return 409;
        if (error.name === "ProtectedUserOperation")
            return 409;
        if (error.name === "ValidationError")
            return 400;
        return 500;
    }
    async renderAdminUsersPage(res, session, pageError = null) {
        const usersResult = await this.adminUsers.listUsers();
        if (usersResult.ok === false) {
            res.status(500).render("auth/users", {
                pageError: pageError ?? usersResult.value.message,
                session,
                users: [],
            });
            return;
        }
        res.render("auth/users", {
            pageError,
            session,
            users: usersResult.value,
        });
    }
    async showLogin(res, session, pageError = null) {
        res.render("auth/login", { pageError, session });
    }
    async showAdminUsers(res, session, pageError = null) {
        await this.renderAdminUsersPage(res, session, pageError);
    }
    async loginFromForm(res, email, password, store) {
        const session = (0, AppSession_1.touchAppSession)(store);
        const result = await this.service.authenticate({ email, password });
        if (result.ok === false) {
            const error = result.value;
            const status = this.mapErrorStatus(error);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `Login failed: ${error.message}`);
            res.status(status);
            await this.showLogin(res, session, error.message);
            return;
        }
        const nextSession = (0, AppSession_1.signInAuthenticatedUser)(store, result.value);
        this.logger.info(`Authenticated ${nextSession.authenticatedUser?.email ?? "unknown user"}`);
        res.redirect("/");
    }
    async logoutFromForm(res, store) {
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        if (currentUser) {
            this.logger.info(`Signing out ${currentUser.email}`);
        }
        (0, AppSession_1.signOutAuthenticatedUser)(store);
        res.redirect("/login");
    }
    async createUserFromForm(res, input, session) {
        const result = await this.adminUsers.createUser(input);
        if (result.ok === false) {
            const status = this.mapErrorStatus(result.value);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `Create user failed: ${result.value.message}`);
            res.status(status);
            await this.renderAdminUsersPage(res, session, result.value.message);
            return;
        }
        this.logger.info(`Created user ${result.value.email}`);
        res.redirect("/admin/users");
    }
    async deleteUserFromForm(res, userId, actingUserId, session) {
        const result = await this.adminUsers.deleteUser(userId, actingUserId);
        if (result.ok === false) {
            const status = this.mapErrorStatus(result.value);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `Delete user failed: ${result.value.message}`);
            res.status(status);
            await this.renderAdminUsersPage(res, session, result.value.message);
            return;
        }
        this.logger.info(`Deleted user ${userId}`);
        res.redirect("/admin/users");
    }
}
function CreateAuthController(service, adminUsers, logger) {
    return new AuthController(service, adminUsers, logger);
}
