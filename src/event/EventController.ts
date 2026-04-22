import type { Response } from "express";
import { type IEventService, type CreateEventInput, type UpdateEventInput } from "./EventService";
import {
  touchAppSession,
  getAuthenticatedUser,
  type IAppBrowserSession,
  type AppSessionStore,
} from "../session/AppSession";
import type { ILoggingService } from "../service/LoggingService";
import type { EventError } from "./errors";
import type { IRsvpController } from "../rsvp/RsvpController";

export interface IEventController {
  showCreateForm(
    res: Response,
    session: IAppBrowserSession,
    input?: Partial<CreateEventInput>,
    pageError?: string | null,
  ): Promise<void>;

  showEventDetail(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void>;

  showDashboard(
    res: Response,
    store: AppSessionStore,
    query: string,
    isHtmx?: boolean,
  ): Promise<void>;

  publishEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void>;

  cancelEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void>;

  createEventFromForm(
    res: Response,
    input: CreateEventInput,
    store: AppSessionStore,
    isHtmx?: boolean,
  ): Promise<void>;

  showEditForm(
    res: Response,
    eventId: string,
    store: AppSessionStore,
    input?: Partial<UpdateEventInput>,
    pageError?: string | null,
  ): Promise<void>;

  updateEventFromForm(
    res: Response,
    eventId: string,
    input: UpdateEventInput,
    store: AppSessionStore,
  ): Promise<void>;

  getOrganizerDashboard(
    res: Response,
    store: AppSessionStore,
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(
    private readonly service: IEventService,
    private readonly logger: ILoggingService,
    private readonly rsvpController?: IRsvpController,
  ) {}

  private mapErrorStatus(error: EventError): number {
    switch (error.name) {
      case "ValidationError":
      case "MissingRequiredField":
      case "FieldTooShort":
      case "FieldTooLong":
      case "InvalidDateFormat":
      case "EndBeforeStart":
      case "StartDateInPast":
      case "InvalidCapacity":
        return 400;
      case "EventNotFound":
        return 404;
      case "EventNotAuthorized":
        return 403;
      case "EventInvalidState":
        return 409;
      case "UnexpectedDependencyError":
      default:
        return 500;
    }
  }

  async showCreateForm(
    res: Response,
    session: IAppBrowserSession,
    input: Partial<CreateEventInput> = {},
    pageError: string | null = null,
  ): Promise<void> {
    res.render("event/create", { session, input, pageError });
  }

  async showEventDetail(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    const result = await this.service.getEventDetails(eventId, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      res.status(status).render("partials/error", {
        message: error.message,
        session,
      });
      return;
    }

    const event = result.value;

    let rsvpView: { canRsvp: boolean; currentStatus: string; goingCount: number; capacity: number } = {
      canRsvp: false,
      currentStatus: "none",
      goingCount: event.attendeeCount,
      capacity: event.capacity,
    };

    if (this.rsvpController) {
      rsvpView = await this.rsvpController.getRsvpView(
        eventId,
        store,
        event.status,
        event.organizerId,
        event.capacity,
      );
    }

    res.render("event/detail", {
      session,
      event,
      user: currentUser,
      rsvpView,
    });
  }

  async getOrganizerDashboard(
    res: Response,
    store: AppSessionStore,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.getOrganizerDashboard(currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;

      log.call(this.logger, `Organizer dashboard failed: ${error.message}`);

      res.status(status).render("partials/error", {
        message: error.message,
        session,
      });
      return;
    }

    res.render("event/organizer-dashboard", {
      draft: result.value.draft,
      published: result.value.published,
      cancelledOrPast: result.value.cancelledOrPast,
      session,
      pageError: null,
    });
  }

  async showDashboard(
    res: Response,
    store: AppSessionStore,
    query: string,
    isHtmx: boolean = false,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    const result = await this.service.listVisibleEvents(currentUser, query);

if (result.ok === false) {
  const status = this.mapErrorStatus(result.value);

  if (isHtmx) {
    res.status(status).render("partials/error", {
      message: result.value.message,
      layout: false,
    });
    return;
  }

  res.status(status).render("home", {
    session,
    events: [],
    user: currentUser,
    pageError: result.value.message,
    searchQuery: query,
  });
  return;
}

    if (isHtmx) {
      res.render("event/partials/event-list", {
        events: result.value,
        user: currentUser,
        layout: false,
      });
      return;
    }

    res.render("home", {
      session,
      events: result.value,
      user: currentUser,
      pageError: null,
      searchQuery: query,
    });
  }

  async publishEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void> {
    const currentUser = getAuthenticatedUser(store);
    const result = await this.service.publishEvent(eventId, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      this.logger.error(`Publish event failed: ${error.message}`);
      res.status(status).render("partials/error", {
        message: error.message,
        session: touchAppSession(store),
      });
      return;
    }

    this.logger.info(`Published event ${result.value.id} "${result.value.title}"`);
    res.redirect("/home");
  }

  async cancelEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void> {
    const currentUser = getAuthenticatedUser(store);
    const result = await this.service.cancelEvent(eventId, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      this.logger.error(`Cancel event failed: ${error.message}`);
      res.status(status).render("partials/error", {
        message: error.message,
        session: touchAppSession(store),
      });
      return;
    }

    this.logger.info(`Cancelled event ${result.value.id} "${result.value.title}"`);
    res.redirect("/events/manage");
  }

  async createEventFromForm(
    res: Response,
    input: CreateEventInput,
    store: AppSessionStore,
    isHtmx: boolean = false,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      this.logger.error("Attempted to create event without authenticated user");
      if (isHtmx) {
        res.status(401).render("partials/error", {
          message: "Please log in to continue.",
          layout: false,
        });
      } else {
        res.redirect("/login");
      }
      return;
    }

    const organizer = {
      userId: currentUser.userId,
      displayName: currentUser.displayName,
    };

    const result = await this.service.createEvent(input, organizer);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Create event failed: ${error.message}`);

      if (isHtmx) {
        res.status(status).render("partials/error", {
          message: error.message,
          layout: false,
        });
      } else {
        res.status(status);
        await this.showCreateForm(res, session, input, error.message);
      }
      return;
    }

    this.logger.info(`Created event ${result.value.id} "${result.value.title}"`);

    if (isHtmx) {
      res.set("HX-Redirect", "/home");
      res.status(200).send("");
    } else {
      res.redirect("/home");
    }
  }

  async showEditForm(
    res: Response,
    eventId: string,
    store: AppSessionStore,
    input: Partial<UpdateEventInput> = {},
    pageError: string | null = null,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    const result = await this.service.getEventDetails(eventId, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      res.status(status).render("partials/error", {
        message: error.message,
        session,
      });
      return;
    }

    const event = result.value;

    const isOwner = currentUser?.userId === event.organizerId;
    const isAdmin = currentUser?.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).render("partials/error", {
        message: "You do not have permission to edit this event.",
        session,
      });
      return;
    }

    if (event.status === "cancelled") {
      res.status(409).render("partials/error", {
        message: "Cancelled events cannot be edited.",
        session,
      });
      return;
    }

    const formInput: Partial<UpdateEventInput> = {
      title: input.title ?? event.title,
      description: input.description ?? event.description,
      location: input.location ?? event.location,
      category: input.category ?? event.category,
      startDate: input.startDate ?? event.startDate,
      endDate: input.endDate ?? event.endDate,
      capacity: input.capacity ?? String(event.capacity),
    };

    res.render("event/edit", {
      session,
      event,
      input: formInput,
      pageError,
    });
  }

  async updateEventFromForm(
    res: Response,
    eventId: string,
    input: UpdateEventInput,
    store: AppSessionStore,
  ): Promise<void> {
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      this.logger.error("Attempted to update event without authenticated user");
      res.redirect("/login");
      return;
    }

    const result = await this.service.updateEvent(eventId, input, currentUser);

    if (result.ok === false) {
      const error = result.value;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Update event failed: ${error.message}`);

      if (
        error.name === "EventNotFound" ||
        error.name === "EventNotAuthorized" ||
        error.name === "EventInvalidState"
      ) {
        res.status(status).render("partials/error", {
          message: error.message,
          session: touchAppSession(store),
        });
        return;
      }

      res.status(status);
      await this.showEditForm(res, eventId, store, input, error.message);
      return;
    }

    this.logger.info(`Updated event ${result.value.id} "${result.value.title}"`);
    res.redirect(`/events/${result.value.id}`);
  }
}

export function CreateEventController(
  service: IEventService,
  logger: ILoggingService,
  rsvpController?: IRsvpController,
): IEventController {
  return new EventController(service, logger, rsvpController);
}