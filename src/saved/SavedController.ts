import type { Response } from "express";
import type { IAuthenticatedUserSession, IAppBrowserSession } from "../session/AppSession";
import type { ISavedService } from "./SavedService";

export interface ISavedController {
  toggleSaved(
    res: Response,
    userId: string,
    role: string,
    eventId: string,
  ): Promise<void>;

  showSavedList(
    res: Response,
    userId: string,
    role: string,
    session: IAppBrowserSession,
    user: IAuthenticatedUserSession | null,
  ): Promise<void>;
}

export function CreateSavedController(
  savedService: ISavedService,
): ISavedController {
  return {
    async toggleSaved(
      res: Response,
      userId: string,
      role: string,
      eventId: string,
    ): Promise<void> {
      const result = await savedService.toggleSavedEvent(userId, role, eventId);

      if (result.ok === false) {
        const error = result.value;
        const code =
          error.name === "ForbiddenRole"
            ? 403
            : error.name === "EventNotFound"
              ? 404
              : 400;

        res.status(code).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.redirect("/saved");
    },

    async showSavedList(
      res: Response,
      userId: string,
      role: string,
      session: IAppBrowserSession,
      user: IAuthenticatedUserSession | null,
    ): Promise<void> {
      const result = await savedService.listSavedEvents(userId, role);

      if (result.ok === false) {
        const error = result.value;
        const code = error.name === "ForbiddenRole" ? 403 : 400;

        res.status(code).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.render("saved-list", {
        session,
        user,
        pageError: null,
        events: result.value,
      });
    },
  };
}