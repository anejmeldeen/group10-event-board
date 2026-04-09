// STUB — owned by Feature 1 (Teammate A).
// Delete this file and import from A's version once F1 is merged to dev.

export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEventRecord {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null; // null = no limit
  startDatetime: string;   // ISO
  endDatetime: string;     // ISO
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

// The fields the edit form (F3) and the create form (F1) can change.
// F3 owns this one; F1 will probably use it too.
export interface IEventUpdateInput {
  title: string;
  description: string;
  location: string;
  category: string;
  capacity: number | null;
  startDatetime: string;
  endDatetime: string;
}