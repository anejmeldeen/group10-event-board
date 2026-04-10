export type RsvpError =
  | { name: "RsvpEventNotFound"; message: string }
  | { name: "RsvpNotAllowed"; message: string }
  | { name: "RsvpInvalidEventState"; message: string }
  | { name: "RsvpRepositoryError"; message: string };

export const RsvpEventNotFound = (message: string): RsvpError => ({
  name: "RsvpEventNotFound",
  message,
});

export const RsvpNotAllowed = (message: string): RsvpError => ({
  name: "RsvpNotAllowed",
  message,
});

export const RsvpInvalidEventState = (message: string): RsvpError => ({
  name: "RsvpInvalidEventState",
  message,
});

export const RsvpRepositoryError = (message: string): RsvpError => ({
  name: "RsvpRepositoryError",
  message,
});