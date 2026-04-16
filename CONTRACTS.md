# Contracts

if you wanna change something here lmk in the gc first

**Team:**
- A. Ali — F1 (Event Creation), F2 (Event Detail)
- B. Nick — F3 (Event Editing), F4 (RSVP Toggle)
- C. Hriday — F5 (Publish/Cancel), F6 (Category & Date Filter)
- D. Eben — F7 (My RSVPs Dashboard), F8 (Organizer Dashboard)
- E. Yuvan - F10 (Search), F9 (User Profile)

---

### 1. Result type — everyone uses this

every service and repo method returns `Result<T, E>` instead of throwing. defined in `src/lib/result.ts`.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; value: E };
```

controllers check `result.ok` and map errors to the right HTTP status. services never touch `req` or `res`.

---

### 2. Event record shape — Ali owns, everyone depends on it

```ts
interface IEventRecord {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  startDate: string;       // ISO 8601
  endDate: string;         // ISO 8601
  organizerId: string;
  organizerName: string;
  status: "draft" | "published" | "cancelled";
  capacity: number;        // 0 = unlimited
  attendeeCount: number;
  createdAt: string;
  updatedAt: string;
}
```

if you need a new field talk to Ali first since F1 owns the repo and seeding.

---

### 3. Event repository — Ali owns, pretty much everyone reads/writes through it

```ts
interface IEventRepository {
  create(event: IEventRecord): Promise<Result<IEventRecord, EventError>>;
  findById(id: string): Promise<Result<IEventRecord | null, EventError>>;
  findAll(): Promise<Result<IEventRecord[], EventError>>;
  findByOrganizerId(organizerId: string): Promise<Result<IEventRecord[], EventError>>;
  update(event: IEventRecord): Promise<Result<IEventRecord, EventError>>;
}
```

to update: load it with `findById`, change what you need, pass the whole thing back to `update`. repo replaces by `id`.

Hriday — F6 filtering and Yuvan — F10 search will prob need new repo methods (like `findByFilters`, `search`). add them to this interface and let us know.

---

### 4. Validation rules — shared between F1 create and F3 edit

same rules for both:

| Field | Rule |
|-------|------|
| title | required, 3–200 chars |
| description | required, 10–5000 chars |
| location | required, max 300 chars |
| category | required, max 100 chars |
| startDate | required, valid date, can't be in the past |
| endDate | required, valid date, must be after startDate |
| capacity | whole number ≥ 0, max 100k. 0 or empty = unlimited |

these are private helpers inside `EventService.ts`. both `createEvent` and `updateEvent` call the same functions so if Ali changes validation it affects Nick's edit too and vice versa. just keep each other posted.

---

### 5. RSVP record + repo — Nick owns, Eben needs for F7

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

```ts
interface IRsvpRepository {
  findByEventAndUser(eventId, userId): Result<IRsvpRecord | null, RsvpError>;
  upsert(rsvp): Result<IRsvpRecord, RsvpError>;
  countGoing(eventId): Result<number, RsvpError>;
  listByUser(userId): Result<IRsvpRecord[], RsvpError>;  // this one's for Eben's F7
}
```

Eben — `listByUser` is there for your dashboard. lmk if you need anything else from this.

---

### 6. RSVP button on the detail page — F2 ↔ F4

Ali renders the detail page (F2), Nick owns the RSVP button (F4). the detail template needs this data:

```ts
{
  canRsvp: boolean;        // false for organizer/admin/staff or cancelled events
  currentRsvpStatus: "none" | "going" | "waitlisted" | "cancelled";
  goingCount: number;
  capacity: number;        // 0 = unlimited
}
```

button labels:
- `none` + space → "RSVP"
- `none` + full → "Join Waitlist"
- `going` → "Cancel RSVP"
- `waitlisted` → "Leave Waitlist"
- `cancelled` → "RSVP Again"

form posts to `POST /events/:id/rsvp`. if `canRsvp` is false don't render the form.

---

### 7. Publish/cancel on the detail page — F2 ↔ F5

Ali renders the page (F2), Hriday owns publish/cancel (F5). there's already a publish button wired to `POST /events/:id/publish`. Hriday needs to add cancel at `POST /events/:id/cancel`.

valid transitions:
- `draft` → `published` (organizer or admin only)
- `published` → `cancelled` (organizer or admin only)

thats it. no going back from cancelled. invalid transitions return `EventInvalidState`.

---

### 8. Dashboard quick actions — F7 and F8 reuse existing routes

Eben's organizer dashboard (F8) has publish/cancel buttons — just point them at the same `POST /events/:id/publish` and `POST /events/:id/cancel` routes Hriday builds for F5. no need to duplicate anything.

Eben's My RSVPs dashboard (F7) has "cancel RSVP" — hit `POST /events/:id/rsvp`, same toggle route Nick is building for F4.

---

### 9. Event list filters (F6) and search (F10)

main event list is at `GET /home`. right now it calls `listVisibleEvents` which just returns everything.

Hriday — for F6, add query params like `?category=social&timeframe=this-week`. only published events in filtered results.

Yuvan — for F10, add `?q=` param. match against title, description, location. empty query = all published upcoming.

you two will probably need to either extend `listVisibleEvents` to take filter/search params or add new service methods. just coordinate so you're not both editing the same function at the same time lol.

---
