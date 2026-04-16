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
  ): Promise<void>;

  publishEvent(
    res: Response,
    eventId: string,
    store: AppSessionStore,
  ): Promise<void>;

  createEventFromForm(
    res: Response,
    input: CreateEventInput,
    store: AppSessionStore,
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
    if (error.name === "ValidationError") return 400;
    if (error.name === "EventNotFound") return 404;
    if (error.name === "EventNotAuthorized") return 403;
    if (error.name === "EventInvalidState") return 409;
    return 500;
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

    // Build RSVP view data if the RSVP controller is available
    let rsvpView: { canRsvp: boolean; currentStatus: string; goingCount: number; capacity: number } = { canRsvp: false, currentStatus: "none", goingCount: event.attendeeCount, capacity: event.capacity };
    if (this.rsvpController) {
      rsvpView = await this.rsvpController.getRsvpView(eventId, store, event.status, event.organizerId, event.capacity);
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
  });
}
  
  async showDashboard(
    res: Response,
    store: AppSessionStore,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    const result = await this.service.listVisibleEvents(currentUser);

    if (result.ok === false) {
      res.render("home", {
        session,
        events: [],
        user: currentUser,
        pageError: "Unable to load events."
      });
      return;
    }

    res.render("home", {
      session,
      events: result.value,
      user: currentUser,
      pageError: null
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

  async createEventFromForm(
    res: Response,
    input: CreateEventInput,
    store: AppSessionStore,
  ): Promise<void> {
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);
    
    // Safety check - the route should have already guarded this
    if (!currentUser) {
      this.logger.error("Attempted to create event without authenticated user");
      res.redirect("/login");
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
      
      res.status(status);
      await this.showCreateForm(res, session, input, error.message);
      return;
    }

    this.logger.info(`Created event ${result.value.id} "${result.value.title}"`);
    
    // Redirect to home dashboard directly per user request
    res.redirect("/home"); 
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

    // Load the event so we can both check permission and pre-fill the form.
    // We deliberately use the service (not the repo directly) so the draft
    // visibility rule and any other business logic is applied consistently.
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

    // Check permission here so the user gets a real 403 instead of seeing
    // the form and only being told no after they hit Save.
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

    // Pre-fill the form with the current event values, unless the caller
    // passed `input` (which happens when re-rendering after a validation error).
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

      // For not-found / not-authorized / invalid-state, the form itself
      // shouldn't be re-rendered — the user has no useful action from here.
      // Show a plain error page instead.
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

      // For ValidationError, re-render the form with the user's input
      // so they can fix it without retyping everything.
      res.status(status);
      await this.showEditForm(res, eventId, store, input, error.message);
      return;
    }

    this.logger.info(`Updated event ${result.value.id} "${result.value.title}"`);
    res.redirect(`/events/${result.value.id}`);
  }

  async showOrganizerDashboard(
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
      res.render("event/organizer-dashboard", {
        session,
        published: [],
        draft: [],
        past: [],
        user: currentUser,
        pageError: "Unable to load your events.",
      });
      return;
    }

    res.render("event/organizer-dashboard", {
      session,
      published: result.value.published,
      draft: result.value.draft,
      past: result.value.past,
      user: currentUser,
      pageError: null,
    });
  }
}

export function CreateEventController(
  service: IEventService,
  logger: ILoggingService,
  rsvpController?: IRsvpController,
): IEventController {
  return new EventController(service, logger, rsvpController);
}
