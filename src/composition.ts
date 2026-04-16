import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateSearchController } from "./search/SearchController";
import { CreateSearchService } from "./search/SearchService";
import { CreateInMemorySavedRepository } from "./saved/InMemorySavedRepository";
import { CreateSavedController } from "./saved/SavedController";
import { CreateSavedService } from "./saved/SavedService";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  const searchService = CreateSearchService();
  const searchController = CreateSearchController(searchService);

  const savedRepository = CreateInMemorySavedRepository();
  const savedService = CreateSavedService(savedRepository);
  const savedController = CreateSavedController(savedService);

  return CreateApp(authController, resolvedLogger, searchController, savedController);
}