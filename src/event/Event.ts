/**
 * Event model types and status definitions.
 *
 * An event starts in "draft" status and is not visible to members
 * until it is explicitly published by an organizer.
 */

export type EventStatus = "draft" | "published" | "cancelled";

/**
 * The full event record stored in the repository.
 */
export interface IEventRecord {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;   // ISO 8601 datetime string
  endDate: string;     // ISO 8601 datetime string
  organizerId: string; // User ID of the organizer who created the event
  organizerName: string;
  status: EventStatus;
  capacity: number;    // Maximum number of attendees (0 = unlimited)
  createdAt: string;   // ISO 8601 datetime string
  updatedAt: string;   // ISO 8601 datetime string
}

/**
 * A summary view of an event suitable for lists / public display.
 */
export interface IEventSummary {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  organizerName: string;
  status: EventStatus;
  capacity: number;
}

export function toEventSummary(event: IEventRecord): IEventSummary {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    organizerName: event.organizerName,
    status: event.status,
    capacity: event.capacity,
  };
}
