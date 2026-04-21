import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

// Event
import { CreateInMemoryEventRepository } from "./event/InMemoryEventRepository";
import { CreateEventService } from "./event/EventService";
import { CreateEventController } from "./event/EventController";

// RSVP
import { CreateInMemoryRsvpRepository } from "./rsvp/InMemoryRsvpRepository";
import { CreateRsvpService } from "./rsvp/RsvpService";
import { CreateRsvpController } from "./rsvp/RsvpController";

// Saved
import { CreateInMemorySavedRepository } from "./saved/InMemorySavedRepository";
import { CreateSavedService } from "./saved/SavedService";
import { CreateSavedController } from "./saved/SavedController";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  const eventRepository = CreateInMemoryEventRepository();
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const savedRepository = CreateInMemorySavedRepository();

  const eventService = CreateEventService(eventRepository, rsvpRepository);
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);
  const savedService = CreateSavedService(savedRepository, eventRepository);

  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);
  const savedController = CreateSavedController(savedService, resolvedLogger);
  const eventController = CreateEventController(eventService, resolvedLogger, rsvpController);

  return CreateApp(
    authController,
    eventController,
    rsvpController,
    savedController,
    resolvedLogger,
  );
}