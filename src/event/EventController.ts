import type { Response } from "express";
import { type IEventService, type CreateEventInput } from "./EventService";
import {
  touchAppSession,
  getAuthenticatedUser,
  type IAppBrowserSession,
  type AppSessionStore,
} from "../session/AppSession";
import type { ILoggingService } from "../service/LoggingService";
import type { EventError } from "./errors";

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
}

class EventController implements IEventController {
  constructor(
    private readonly service: IEventService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: EventError): number {
    if (error.name === "ValidationError") return 400;
    if (error.name === "EventNotFound") return 404;
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
    
    // Safety check - the route should have already guarded this, but it also allows optional auth handling?
    // Wait, prompt says: "Any authenticated user can view a page" so currentUser is guaranteed if route is guarded
    
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

    res.render("event/detail", { 
      session, 
      event: result.value,
      user: currentUser 
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
}

export function CreateEventController(
  service: IEventService,
  logger: ILoggingService,
): IEventController {
  return new EventController(service, logger);
}
