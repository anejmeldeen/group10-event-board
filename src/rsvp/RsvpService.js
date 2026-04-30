"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRsvpService = CreateRsvpService;
const node_crypto_1 = require("node:crypto");
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
class RsvpService {
    rsvpRepo;
    eventRepo;
    constructor(rsvpRepo, eventRepo) {
        this.rsvpRepo = rsvpRepo;
        this.eventRepo = eventRepo;
    }
    async getMyRsvpDashboard(currentUser) {
        if (currentUser.role === "admin" || currentUser.role === "staff") {
            return (0, result_1.Err)((0, errors_1.RsvpNotAllowed)("Only members can access the RSVP dashboard."));
        }
        const rsvpResult = await this.rsvpRepo.listByUser(currentUser.userId);
        if (rsvpResult.ok === false) {
            return (0, result_1.Err)(rsvpResult.value);
        }
        const now = new Date();
        const upcoming = [];
        const history = [];
        for (const rsvp of rsvpResult.value) {
            const eventResult = await this.eventRepo.findById(rsvp.eventId);
            if (eventResult.ok === false) {
                return (0, result_1.Err)((0, errors_1.RsvpEventNotFound)("Event not found."));
            }
            const event = eventResult.value;
            if (!event) {
                return (0, result_1.Err)((0, errors_1.RsvpEventNotFound)("Event not found."));
            }
            const item = {
                eventId: event.id,
                title: event.title,
                location: event.location,
                category: event.category,
                startDate: event.startDate,
                endDate: event.endDate,
                eventStatus: event.status,
                rsvpStatus: rsvp.status,
                organizerName: event.organizerName,
            };
            const eventEnded = new Date(event.endDate) < now;
            const isHistory = event.status === "cancelled" ||
                eventEnded ||
                rsvp.status === "cancelled";
            if (isHistory) {
                history.push(item);
            }
            else {
                upcoming.push(item);
            }
        }
        upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        history.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        return (0, result_1.Ok)({ upcoming, history });
    }
    async toggleRsvp(eventId, currentUser) {
        // 1. Load the event
        const eventResult = await this.eventRepo.findById(eventId);
        if (eventResult.ok === false) {
            return (0, result_1.Err)((0, errors_1.RsvpEventNotFound)("Event not found."));
        }
        const event = eventResult.value;
        if (!event) {
            return (0, result_1.Err)((0, errors_1.RsvpEventNotFound)("Event not found."));
        }
        // 2. Check event state — only published events accept RSVPs
        if (event.status !== "published") {
            return (0, result_1.Err)((0, errors_1.RsvpInvalidEventState)("You cannot RSVP to this event."));
        }
        // 3. Check role — only regular users (members) can RSVP
        if (currentUser.role === "admin" || currentUser.role === "staff") {
            return (0, result_1.Err)((0, errors_1.RsvpNotAllowed)("Organizers and admins cannot RSVP to events."));
        }
        // 3.5. Check private event rules
        if (event.isPrivate) {
            if (!event.invitedEmails.some(e => e.toLowerCase() === currentUser.email.toLowerCase())) {
                return (0, result_1.Err)((0, errors_1.RsvpNotAllowed)("You are not invited to this private event."));
            }
        }
        // 4. Load existing RSVP (if any)
        const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, currentUser.userId);
        if (existingResult.ok === false) {
            return (0, result_1.Err)(existingResult.value);
        }
        const existing = existingResult.value;
        // 5. Get current going count
        const countResult = await this.rsvpRepo.countGoing(eventId);
        if (countResult.ok === false) {
            return (0, result_1.Err)(countResult.value);
        }
        const goingCount = countResult.value;
        // 6. Determine the new status based on current state
        let newStatus;
        if (!existing) {
            // Case A: no RSVP yet — create new
            const isFull = event.capacity > 0 && goingCount >= event.capacity;
            newStatus = isFull ? "waitlisted" : "going";
        }
        else if (existing.status === "going" || existing.status === "waitlisted") {
            // Case B: currently active — cancel it
            newStatus = "cancelled";
        }
        else {
            // Case C: currently cancelled — reactivate
            const isFull = event.capacity > 0 && goingCount >= event.capacity;
            newStatus = isFull ? "waitlisted" : "going";
        }
        // 7. Save the RSVP
        const now = new Date().toISOString();
        const rsvpRecord = {
            id: existing?.id ?? (0, node_crypto_1.randomUUID)(),
            eventId,
            userId: currentUser.userId,
            status: newStatus,
            createdAt: existing?.createdAt ?? now,
        };
        const saveResult = await this.rsvpRepo.upsert(rsvpRecord);
        if (saveResult.ok === false) {
            return (0, result_1.Err)(saveResult.value);
        }
        // 8. Recount after the toggle
        const newCountResult = await this.rsvpRepo.countGoing(eventId);
        if (newCountResult.ok === false) {
            return (0, result_1.Err)(newCountResult.value);
        }
        const newGoingCount = newCountResult.value;
        // 9. Update attendeeCount on the event so A's UI stays in sync
        event.attendeeCount = newGoingCount;
        event.updatedAt = now;
        await this.eventRepo.update(event);
        return (0, result_1.Ok)({
            toggleResult: {
                newStatus,
                goingCount: newGoingCount,
                capacity: event.capacity,
            },
            event
        });
    }
    async getRsvpView(eventId, currentUser, event) {
        // Check if private event rules fail first
        let isAllowed = true;
        if (event.isPrivate) {
            const isInvited = currentUser && event.invitedEmails.some(e => e.toLowerCase() === currentUser.email.toLowerCase());
            if (!isInvited) {
                isAllowed = false;
            }
        }
        // If not logged in, or organizer/admin/staff, or event not published — can't RSVP
        if (!isAllowed ||
            !currentUser ||
            currentUser.role === "admin" ||
            currentUser.role === "staff" ||
            event.status !== "published") {
            const countResult = await this.rsvpRepo.countGoing(eventId);
            const goingCount = countResult.ok ? countResult.value : 0;
            return (0, result_1.Ok)({
                canRsvp: false,
                currentStatus: "none",
                goingCount,
                capacity: event.capacity,
            });
        }
        // Load existing RSVP for this user
        const existingResult = await this.rsvpRepo.findByEventAndUser(eventId, currentUser.userId);
        if (existingResult.ok === false) {
            return (0, result_1.Err)(existingResult.value);
        }
        const countResult = await this.rsvpRepo.countGoing(eventId);
        if (countResult.ok === false) {
            return (0, result_1.Err)(countResult.value);
        }
        return (0, result_1.Ok)({
            canRsvp: true,
            currentStatus: existingResult.value?.status ?? "none",
            goingCount: countResult.value,
            capacity: event.capacity,
        });
    }
    async getUserRsvpStatuses(userId) {
        const rsvps = await this.rsvpRepo.listByUser(userId);
        if (rsvps.ok === false)
            return (0, result_1.Err)(rsvps.value);
        const map = new Map();
        for (const rsvp of rsvps.value) {
            map.set(rsvp.eventId, rsvp.status);
        }
        return (0, result_1.Ok)(map);
    }
}
function CreateRsvpService(rsvpRepo, eventRepo) {
    return new RsvpService(rsvpRepo, eventRepo);
}
