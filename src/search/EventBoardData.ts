export interface EventBoardItem {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: "draft" | "published" | "cancelled" | "past";
  startDate: string;
  endDate: string;
  organizerId: string;
  organizerName: string;
  attendeeCount: number;
  capacity: number;
}

const EVENT_BOARD_DATA: EventBoardItem[] = [
  {
    id: "evt-1",
    title: "Farmers Market Friday",
    description: "Fresh produce and local vendors.",
    location: "Town Common",
    category: "social",
    status: "published",
    startDate: "2026-04-18T10:00:00",
    endDate: "2026-04-18T13:00:00",
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 18,
    capacity: 50,
  },
  {
    id: "evt-2",
    title: "JavaScript Study Jam",
    description: "Group study session for web programming.",
    location: "Campus Library",
    category: "educational",
    status: "published",
    startDate: "2026-04-20T17:00:00",
    endDate: "2026-04-20T19:00:00",
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 12,
    capacity: 20,
  },
  {
    id: "evt-3",
    title: "Volunteer Park Cleanup",
    description: "Help clean up the neighborhood park.",
    location: "Kendrick Park",
    category: "volunteer",
    status: "published",
    startDate: "2026-04-22T09:00:00",
    endDate: "2026-04-22T11:30:00",
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 9,
    capacity: 30,
  },
  {
    id: "evt-4",
    title: "Open Gym Basketball",
    description: "Pickup basketball games for all levels.",
    location: "Rec Center",
    category: "sports",
    status: "published",
    startDate: "2026-04-24T18:00:00",
    endDate: "2026-04-24T20:00:00",
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 14,
    capacity: 24,
  },
  {
    id: "evt-5",
    title: "Cancelled Art Walk",
    description: "Downtown gallery walk.",
    location: "Main Street",
    category: "arts",
    status: "cancelled",
    startDate: "2026-04-17T18:00:00",
    endDate: "2026-04-17T20:00:00",
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 0,
    capacity: 40,
  },
  {
    id: "evt-6",
    title: "Past Community Meeting",
    description: "Neighborhood planning discussion.",
    location: "Town Hall",
    category: "educational",
    status: "past",
    startDate: "2026-04-01T18:00:00",
    endDate: "2026-04-01T19:00:00",
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    attendeeCount: 22,
    capacity: 60,
  },
];

export function getAllEventBoardItems(): EventBoardItem[] {
  return [...EVENT_BOARD_DATA];
}

export function getPublishedUpcomingEventBoardItems(): EventBoardItem[] {
  const now = new Date();

  return EVENT_BOARD_DATA.filter((event) => {
    return event.status === "published" && new Date(event.endDate) > now;
  });
}

export function findEventBoardItemById(eventId: string): EventBoardItem | null {
  return EVENT_BOARD_DATA.find((event) => event.id === eventId) ?? null;
}