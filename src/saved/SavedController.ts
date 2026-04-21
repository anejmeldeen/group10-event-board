import type { Response } from "express";
import {
  getAuthenticatedUser,
  touchAppSession,
  type AppSessionStore,
} from "../session/AppSession";
import type { ILoggingService } from "../service/LoggingService";
import type { ISavedService } from "./SavedService";
import type { SavedError } from "./SavedRepository";

export interface ISavedController {
  showSavedEvents(
    res: Response,
    store: AppSessionStore,
  ): Promise<void>;

  toggleSavedEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
    returnTo?: string,
  ): Promise<void>;
}

class SavedController implements ISavedController {
  constructor(
    private readonly service: ISavedService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: SavedError): number {
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

  async showSavedEvents(
    res: Response,
    store: AppSessionStore,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

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

  async toggleSavedEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
    returnTo: string = "/saved",
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.toggleSavedEvent(eventId, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Save toggle failed: ${error.message}`);

      res.status(status).render("partials/error", {
        message: error.message,
        session,
      });
      return;
    }

    this.logger.info(`Save toggled for event ${eventId}: ${result.value.saved}`);
    res.redirect(returnTo || "/saved");
  }
}

export function CreateSavedController(
  service: ISavedService,
  logger: ILoggingService,
): ISavedController {
  return new SavedController(service, logger);
}