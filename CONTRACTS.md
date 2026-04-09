# Contracts

Shared stuff between our features. If you need to change something here, let the group chat know first.

- A: features 1, 2
- Me: features 3, 4
- C: features 5, 6
- D: features 7, 8

---

## Event shape (A owns)

```ts
type EventStatus = "draft" | "published" | "cancelled" | "past";

interface IEventRecord {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: EventStatus;
  capacity: number | null;   // null = no limit
  startDatetime: string;     // ISO
  endDatetime: string;       // ISO
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}
```

## Event repository (A owns)

```ts
interface IEventRepository {
  findById(id): Result<IEventRecord | null, EventError>;
  listAll(): Result<IEventRecord[], EventError>;
  create(event): Result<IEventRecord, EventError>;
  update(event): Result<IEventRecord, EventError>;
}
```

`update` takes a whole event. Load it, change the fields, save it back.

## Validation rules (shared by F1 and F3)

Same rules for create and edit:
- title: not empty, max 200 chars
- description: not empty
- location: not empty
- category: not empty
- start + end are valid dates, end after start
- capacity: null or a whole number ≥ 1

A — can you put these in a shared file so I can import them for F3?

---

## `updateEvent(id, input, actingUser)` — F3 (me)

Errors:
- `EventNotFound`
- `EventNotAuthorized` — not the organizer and not admin
- `EventInvalidState` — event is cancelled or past
- `EventValidationError` — bad input

## `publishEvent` / `cancelEvent` — F5 (C)

Just noting these exist so C and I don't collide on the repo's `update` method.

---

## RSVP shape (me)

```ts
type RsvpStatus = "going" | "waitlisted" | "cancelled";

interface IRsvpRecord {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: string;
}
```

## RSVP repository (me)

```ts
interface IRsvpRepository {
  findByEventAndUser(eventId, userId): Result<IRsvpRecord | null, RsvpError>;
  upsert(rsvp): Result<IRsvpRecord, RsvpError>;
  countGoing(eventId): Result<number, RsvpError>;
  listByUser(userId): Result<IRsvpRecord[], RsvpError>;   // for D's F7
}
```

D — let me know if you need anything else from this for F7 or F8.

## `toggleRsvp(eventId, actingUser)` — F4 (me)

Returns: `{ newStatus, goingCount, capacity }`

Errors:
- `RsvpEventNotFound`
- `RsvpNotAllowed` — organizer, admin, or staff can't RSVP
- `RsvpInvalidEventState` — event is cancelled or past

Logic:
- no RSVP yet → going, or waitlisted if full
- currently going/waitlisted → cancelled
- currently cancelled → going, or waitlisted if full

---

## RSVP button on the detail page

Detail page is A's (F2), RSVP button is mine (F4). A's route needs to pass this into the template:

```ts
{
  canRsvp: boolean;     // false for organizer/admin/staff or cancelled/past events
  currentStatus: "none" | "going" | "waitlisted" | "cancelled";
  goingCount: number;
  capacity: number | null;
}
```

Button label:
- none + space → "RSVP"
- none + full → "Join waitlist"
- going → "Cancel RSVP"
- waitlisted → "Leave waitlist"
- cancelled → "RSVP again"

Form posts to `/events/:id/rsvp`. If `canRsvp` is false, don't show the form.

---

## Open questions

- Where does the shared validation file live? (A)
- Can someone seed a few fake events so we can all test? (A probably, since F1 owns the repo)
