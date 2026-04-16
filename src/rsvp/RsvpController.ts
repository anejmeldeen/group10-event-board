import type { Response } from "express";
import type { IRsvpService } from "./RsvpService";
import type { IRsvpView } from "./Rsvp";
import {
  getAuthenticatedUser,
  touchAppSession,
  type AppSessionStore,
} from "../session/AppSession";
import type { ILoggingService } from "../service/LoggingService";
import type { RsvpError } from "./errors";

export interface IRsvpController {
  toggleRsvp(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void>;

  getRsvpView(
    eventId: string,
    store: AppSessionStore,
    eventStatus: string,
    eventOrganizerId: string,
    eventCapacity: number,
  ): Promise<IRsvpView>;

  getMyRsvpDashboard(
    res: Response,
    store: AppSessionStore,
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly service: IRsvpService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: RsvpError): number {
    if (error.name === "RsvpEventNotFound") return 404;
    if (error.name === "RsvpNotAllowed") return 403;
    if (error.name === "RsvpInvalidEventState") return 409;
    return 500;
  }

  async toggleRsvp(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.toggleRsvp(eventId, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `RSVP toggle failed: ${error.message}`);
      res.status(status).render("partials/error", {
        message: error.message,
        session,
      });
      return;
    }

    this.logger.info(`RSVP toggled for event ${eventId}: ${result.value.newStatus}`);
    res.redirect(`/events/${eventId}`);
  }

  async getRsvpView(
    eventId: string,
    store: AppSessionStore,
    eventStatus: string,
    eventOrganizerId: string,
    eventCapacity: number,
  ): Promise<IRsvpView> {
    const currentUser = getAuthenticatedUser(store);

    const result = await this.service.getRsvpView(
      eventId,
      currentUser,
      eventStatus,
      eventOrganizerId,
      eventCapacity,
    );

    if (result.ok === false) {
      return {
        canRsvp: false,
        currentStatus: "none",
        goingCount: 0,
        capacity: eventCapacity,
      };
    }

    return result.value;
  }

  async getMyRsvpDashboard(
  res: Response,
  store: AppSessionStore,
): Promise<void> {
  const session = touchAppSession(store);
  const currentUser = getAuthenticatedUser(store);

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
}

export function CreateRsvpController(
  service: IRsvpService,
  logger: ILoggingService,
): IRsvpController {
  return new RsvpController(service, logger);
}