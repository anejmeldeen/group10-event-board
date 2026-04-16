import { Ok, type Result } from "../lib/result";
import {
  getPublishedUpcomingEventBoardItems,
  type EventBoardItem,
} from "./EventBoardData";

export interface SearchEventsInput {
  query: string;
}

export interface ISearchService {
  searchPublishedUpcomingEvents(
    input: SearchEventsInput,
  ): Promise<Result<EventBoardItem[], never>>;
}

export function CreateSearchService(): ISearchService {
  return {
    async searchPublishedUpcomingEvents(
      input: SearchEventsInput,
    ): Promise<Result<EventBoardItem[], never>> {
      const trimmedQuery = input.query.trim().toLowerCase();
      const publishedUpcoming = getPublishedUpcomingEventBoardItems();

      if (trimmedQuery === "") {
        return Ok(publishedUpcoming);
      }

      const results = publishedUpcoming.filter((event) => {
        return (
          event.title.toLowerCase().includes(trimmedQuery) ||
          event.description.toLowerCase().includes(trimmedQuery) ||
          event.location.toLowerCase().includes(trimmedQuery)
        );
      });

      return Ok(results);
    },
  };
}