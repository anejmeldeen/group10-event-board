import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
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
import { CreatePrismaEventRepository } from "./event/PrismaEventRepository";
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

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  const eventRepository = CreatePrismaEventRepository(prisma);
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const savedRepository = CreateInMemorySavedRepository();

  const eventService = CreateEventService(eventRepository, rsvpRepository);
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);
  const savedService = CreateSavedService(savedRepository, eventRepository);

  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);
  const savedController = CreateSavedController(savedService, resolvedLogger);
  const eventController = CreateEventController(eventService, resolvedLogger, rsvpController, savedService);

  return CreateApp(
    authController,
    eventController,
    rsvpController,
    savedController,
    resolvedLogger,
  );
}