import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { EventService } from "./events/EventService";
import { InMemoryEventRepository } from "./events/InMemoryEventRepository";
import { EventController } from "./events/EventController";
import type { Event } from "./events/Event";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);
  const seedEvents: Event[] = [
    {
      id: "evt-1",
      title: "Campus Soccer Night",
      description: "Pickup soccer for all skill levels.",
      location: "Rec Field",
      category: "sports",
      capacity: 30,
      status: "published",
      startAt: new Date("2026-04-18T18:00:00"),
      endAt: new Date("2026-04-18T20:00:00"),
      organizerId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "evt-2",
      title: "Poetry Open Mic",
      description: "Bring your own work or just listen.",
      location: "Student Union",
      category: "arts",
      capacity: null,
      status: "draft",
      startAt: new Date("2026-04-20T19:00:00"),
      endAt: new Date("2026-04-20T21:00:00"),
      organizerId: "user-2",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const eventRepository = new InMemoryEventRepository(seedEvents);
  const eventService = new EventService(eventRepository);
  const eventController = new EventController(eventService);

  return CreateApp(authController, resolvedLogger, eventController);
}
