"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRsvpController = CreateRsvpController;
const AppSession_1 = require("../session/AppSession");
class RsvpController {
    service;
    logger;
    constructor(service, logger) {
        this.service = service;
        this.logger = logger;
    }
    mapErrorStatus(error) {
        if (error.name === "RsvpEventNotFound")
            return 404;
        if (error.name === "RsvpNotAllowed")
            return 403;
        if (error.name === "RsvpInvalidEventState")
            return 409;
        return 500;
    }
    async toggleRsvp(req, res, eventId, store) {
        const session = (0, AppSession_1.touchAppSession)(store);
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        if (!currentUser) {
            res.redirect("/login");
            return;
        }
        const isHtmx = res.req?.get?.("HX-Request") === "true";
        const result = await this.service.toggleRsvp(eventId, currentUser);
        if (result.ok === false) {
            const error = result.value;
            const status = this.mapErrorStatus(error);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `RSVP toggle failed: ${error.message}`);
            res.status(status).render("partials/error", {
                message: error.message,
                session,
                layout: false,
            });
            return;
        }
        this.logger.info(`RSVP toggled for event ${eventId}: ${result.value.toggleResult.newStatus}`);
        if (isHtmx) {
            const variant = req.body.variant;
            const rsvpView = await this.getRsvpView(eventId, store, result.value.event);
            res.render("event/partials/rsvp", {
                rsvpView,
                eventId,
                capacity: result.value.toggleResult.capacity,
                variant,
                layout: false,
            });
            return;
        }
        res.redirect(`/events/${eventId}`);
    }
    async getRsvpView(eventId, store, event) {
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        const result = await this.service.getRsvpView(eventId, currentUser, event);
        if (result.ok === false) {
            return {
                canRsvp: false,
                currentStatus: "none",
                goingCount: 0,
                capacity: event.capacity,
            };
        }
        return result.value;
    }
    async getMyRsvpDashboard(res, store) {
        const session = (0, AppSession_1.touchAppSession)(store);
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        if (!currentUser) {
            res.redirect("/login");
            return;
        }
        const result = await this.service.getMyRsvpDashboard(currentUser);
        if (result.ok === false) {
            const error = result.value;
            const status = this.mapErrorStatus(error);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `RSVP dashboard failed: ${error.message}`);
            res.status(status).render("partials/error", {
                message: error.message,
                session,
            });
            return;
        }
        res.render("rsvp/dashboard", {
            upcoming: result.value.upcoming,
            history: result.value.history,
            session,
        });
    }
    async cancelRsvpFromDashboard(res, eventId, store) {
        const session = (0, AppSession_1.touchAppSession)(store);
        const currentUser = (0, AppSession_1.getAuthenticatedUser)(store);
        if (!currentUser) {
            res.redirect("/login");
            return;
        }
        const result = await this.service.toggleRsvp(eventId, currentUser);
        if (result.ok === false) {
            const error = result.value;
            const status = this.mapErrorStatus(error);
            const log = status >= 500 ? this.logger.error : this.logger.warn;
            log.call(this.logger, `RSVP cancel failed: ${error.message}`);
            res.status(status).render("partials/error", {
                message: error.message,
                session,
                layout: false,
            });
            return;
        }
        const dashboardResult = await this.service.getMyRsvpDashboard(currentUser);
        if (dashboardResult.ok === false) {
            res.status(500).render("partials/error", {
                message: dashboardResult.value.message,
                session,
                layout: false,
            });
            return;
        }
        const allItems = [
            ...dashboardResult.value.upcoming,
            ...dashboardResult.value.history,
        ];
        const item = allItems.find((entry) => entry.eventId === eventId);
        if (!item) {
            res.status(200).send("");
            return;
        }
        res.render("rsvp/dashboard-row", { item, layout: false });
    }
}
function CreateRsvpController(service, logger) {
    return new RsvpController(service, logger);
}
