export type EventStatus = "draft" | "published" | "cancelled" | "past";

export type EventCategory =
  | "social"
  | "educational"
  | "volunteer"
  | "sports"
  | "arts";

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  capacity?: number | null;
  status: EventStatus;
  startAt: Date;
  endAt: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}