import type { Response } from "express";
import type { IAuthenticatedUserSession, IAppBrowserSession } from "../session/AppSession";
import type { ISearchService } from "./SearchService";

export interface ISearchController {
  showHomePage(
    res: Response,
    query: string,
    session: IAppBrowserSession,
    user: IAuthenticatedUserSession | null,
  ): Promise<void>;
}

export function CreateSearchController(
  searchService: ISearchService,
): ISearchController {
  return {
    async showHomePage(
      res: Response,
      query: string,
      session: IAppBrowserSession,
      user: IAuthenticatedUserSession | null,
    ): Promise<void> {
      const result = await searchService.searchPublishedUpcomingEvents({ query });

      res.render("home", {
        session,
        user,
        pageError: null,
        searchQuery: query,
        events: result.value,
      });
    },
  };
}