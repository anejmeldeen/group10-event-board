export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface IRsvpRecord {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: string; // ISO — determines waitlist order
}

/** What the controller needs to render the RSVP button and count. */
export interface IRsvpView {
  canRsvp: boolean;
  currentStatus: RsvpStatus | "none";
  goingCount: number;
  capacity: number;
}

/** What toggleRsvp returns on success. */
export interface IToggleRsvpResult {
  newStatus: RsvpStatus;
  goingCount: number;
  capacity: number;
}