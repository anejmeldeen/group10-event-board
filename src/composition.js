"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComposedApp = createComposedApp;
const client_1 = require("@prisma/client");
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
const AdminUserService_1 = require("./auth/AdminUserService");
const AuthController_1 = require("./auth/AuthController");
const AuthService_1 = require("./auth/AuthService");
const InMemoryUserRepository_1 = require("./auth/InMemoryUserRepository");
const PasswordHasher_1 = require("./auth/PasswordHasher");
const app_1 = require("./app");
const LoggingService_1 = require("./service/LoggingService");
// Event
const PrismaEventRepository_1 = require("./event/PrismaEventRepository");
const EventService_1 = require("./event/EventService");
const EventController_1 = require("./event/EventController");
// RSVP
const PrismaRsvpRepository_1 = require("./rsvp/PrismaRsvpRepository");
const RsvpService_1 = require("./rsvp/RsvpService");
const RsvpController_1 = require("./rsvp/RsvpController");
// Saved
const PrismaSavedRepository_1 = require("./saved/PrismaSavedRepository");
const SavedService_1 = require("./saved/SavedService");
const SavedController_1 = require("./saved/SavedController");
function createComposedApp(logger) {
    const resolvedLogger = logger ?? (0, LoggingService_1.CreateLoggingService)();
    const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    });
    const prisma = new client_1.PrismaClient({ adapter });
    const authUsers = (0, InMemoryUserRepository_1.CreateInMemoryUserRepository)();
    const passwordHasher = (0, PasswordHasher_1.CreatePasswordHasher)();
    const authService = (0, AuthService_1.CreateAuthService)(authUsers, passwordHasher);
    const adminUserService = (0, AdminUserService_1.CreateAdminUserService)(authUsers, passwordHasher);
    const authController = (0, AuthController_1.CreateAuthController)(authService, adminUserService, resolvedLogger);
    const eventRepository = (0, PrismaEventRepository_1.CreatePrismaEventRepository)(prisma);
    const rsvpRepository = (0, PrismaRsvpRepository_1.CreatePrismaRsvpRepository)(prisma);
    const savedRepository = (0, PrismaSavedRepository_1.CreatePrismaSavedRepository)(prisma);
    const eventService = (0, EventService_1.CreateEventService)(eventRepository, rsvpRepository);
    const rsvpService = (0, RsvpService_1.CreateRsvpService)(rsvpRepository, eventRepository);
    const savedService = (0, SavedService_1.CreateSavedService)(savedRepository, eventRepository);
    const rsvpController = (0, RsvpController_1.CreateRsvpController)(rsvpService, resolvedLogger);
    const savedController = (0, SavedController_1.CreateSavedController)(savedService, resolvedLogger);
    const eventController = (0, EventController_1.CreateEventController)(eventService, resolvedLogger, rsvpController, savedService, rsvpService);
    return (0, app_1.CreateApp)(authController, eventController, rsvpController, savedController, resolvedLogger);
}
