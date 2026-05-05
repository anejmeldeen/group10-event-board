"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSavedController = CreateSavedController;
const AppSession_1 = require("../session/AppSession");
class SavedController {
    service;
    logger;
    constructor(service, logger) {
        this.service = service;
        this.logger = logger;
    }
    mapErrorStatus(error) {
        switch (error.name) {
            case "SavedEventNotFound":
                return 404;
            case "SavedNotAllowed":
                return 403;
            case "SavedInvalidEventState":
                return 409;
            case "SavedDependencyError":
            default:
                return 500;
        }
    }
    async showSavedEvents(res, store) {
        const session = (0, AppSession_1.touchAppSession)(store);
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        if (!currentUser) {
            res.redirect("/login");
            return;
        }
        const result = await this.service.getSavedEvents(currentUser);
        if (result.ok === false) {
            const error = result.value;
            const status = this.mapErrorStatus(error);
            res.status(status).render("partials/error", {
                message: error.message,
                session,
            });
            return;
        }
        res.render("saved-list", {
            session,
            user: currentUser,
            events: result.value,
            pageError: null,
        });
    }
    async toggleSavedEvent(res, eventId, store, returnTo = "/saved", context = "saved", isHtmx = false) {
        const session = (0, AppSession_1.touchAppSession)(store);
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        if (!currentUser) {
            if (isHtmx) {
                res.status(401).render("partials/error", {
                    message: "Please log in to continue.",
                    layout: false,
                });
                return;
            }
            res.redirect("/login");
            return;
        }
        const result = await this.service.toggleSavedEvent(eventId, currentUser);
        if (result.ok === false) {
            const error = result.value;
            const status = this.mapErrorStatus(error);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `Save toggle failed: ${error.message}`);
            if (isHtmx) {
                res.status(status).render("partials/error", {
                    message: error.message,
                    layout: false,
                });
                return;
            }
            res.status(status).render("partials/error", {
                message: error.message,
                session,
            });
            return;
        }
        this.logger.info(`Save toggled for event ${eventId}: ${result.value.saved}`);
        if (isHtmx) {
            if (context === "saved") {
                const savedEvents = await this.service.getSavedEvents(currentUser);
                if (savedEvents.ok === false) {
                    res.status(this.mapErrorStatus(savedEvents.value)).render("partials/error", {
                        message: savedEvents.value.message,
                        layout: false,
                    });
                    return;
                }
                res.render("partials/saved-list-content", {
                    events: savedEvents.value,
                    user: currentUser,
                    layout: false,
                });
                return;
            }
            res.render("partials/saved-toggle-button", {
                eventId,
                saved: result.value.saved,
                returnTo,
                context,
                htmx: true,
                layout: false,
            });
            return;
        }
        res.redirect(returnTo || "/saved");
    }
}
function CreateSavedController(service, logger) {
    return new SavedController(service, logger);
}
