import type { Request, Response } from "express";
import { EventService } from "./EventService";

export class EventController {
  constructor(private readonly eventService: EventService) {}

  async listEvents(req: Request, res: Response): Promise<void> {
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;

    const timeframe =
      typeof req.query.timeframe === "string"
        ? req.query.timeframe
        : undefined;

    const result = await this.eventService.filterPublishedEvents({
      category,
      timeframe,
    });

    if (result.ok === false) {
      res.status(400).render("partials/error", {
        message: "Invalid filter value.",
        layout: false,
      });
      return;
    }

    res.send(result.value);
  }
}