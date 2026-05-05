"use strict";
/**
 * Event service: business logic and validation for event creation.
 *
 * Validates all inputs before delegating to the repository.
 * Uses Result<T, E> for error handling — no thrown exceptions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEventService = CreateEventService;
const node_crypto_1 = require("node:crypto");
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
const Event_1 = require("./Event");
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 300;
const MAX_CATEGORY_LENGTH = 100;
const MAX_CAPACITY = 100_000;
const MAX_SEARCH_QUERY_LENGTH = 100;
function validateTitle(title) {
    const trimmed = title.trim();
    if (!trimmed) {
        return (0, errors_1.MissingRequiredField)("Title is required.", "title");
    }
    if (trimmed.length < 3) {
        return (0, errors_1.FieldTooShort)("Title must be at least 3 characters.", "title");
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
        return (0, errors_1.FieldTooLong)(`Title must be at most ${MAX_TITLE_LENGTH} characters.`, "title");
    }
    return null;
}
function validateDescription(description) {
    const trimmed = description.trim();
    if (!trimmed) {
        return (0, errors_1.MissingRequiredField)("Description is required.", "description");
    }
    if (trimmed.length < 10) {
        return (0, errors_1.FieldTooShort)("Description must be at least 10 characters.", "description");
    }
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
        return (0, errors_1.FieldTooLong)(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`, "description");
    }
    return null;
}
function validateLocation(location) {
    const trimmed = location.trim();
    if (!trimmed) {
        return (0, errors_1.MissingRequiredField)("Location is required.", "location");
    }
    if (trimmed.length > MAX_LOCATION_LENGTH) {
        return (0, errors_1.FieldTooLong)(`Location must be at most ${MAX_LOCATION_LENGTH} characters.`, "location");
    }
    return null;
}
function validateCategory(category) {
    const trimmed = category.trim();
    if (!trimmed) {
        return (0, errors_1.MissingRequiredField)("Category is required.", "category");
    }
    if (trimmed.length > MAX_CATEGORY_LENGTH) {
        return (0, errors_1.FieldTooLong)(`Category must be at most ${MAX_CATEGORY_LENGTH} characters.`, "category");
    }
    return null;
}
function validateSearchQuery(query) {
    const trimmed = query.trim();
    if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
        return (0, errors_1.FieldTooLong)(`Search query must be at most ${MAX_SEARCH_QUERY_LENGTH} characters.`, "query");
    }
    return null;
}
function validateFilterCategory(category) {
    const trimmed = category.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }
    const allowedCategories = ["social", "educational", "volunteer", "sports", "arts"];
    if (!allowedCategories.includes(trimmed)) {
        return (0, errors_1.ValidationError)("Invalid category filter.", "category");
    }
    return null;
}
function validateFilterTimeframe(timeframe) {
    const trimmed = timeframe.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }
    const allowedTimeframes = ["this-week", "this-weekend"];
    if (!allowedTimeframes.includes(trimmed)) {
        return (0, errors_1.ValidationError)("Invalid timeframe filter.", "timeframe");
    }
    return null;
}
function parseAndValidateDate(raw, fieldName) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return (0, result_1.Err)((0, errors_1.MissingRequiredField)(`${fieldName} is required.`, fieldName.toLowerCase().replace(/ /g, "")));
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
        return (0, result_1.Err)((0, errors_1.InvalidDateFormat)(`${fieldName} is not a valid date.`, fieldName.toLowerCase().replace(/ /g, "")));
    }
    return (0, result_1.Ok)(parsed);
}
function validateDateRange(start, end) {
    if (end <= start) {
        return (0, errors_1.EndBeforeStart)("End date must be after the start date.");
    }
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    if (start < oneMinuteAgo) {
        return (0, errors_1.StartDateInPast)("Start date cannot be in the past.");
    }
    return null;
}
function parseAndValidateCapacity(raw) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "0") {
        return (0, result_1.Ok)(0);
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < 0) {
        return (0, result_1.Err)((0, errors_1.InvalidCapacity)("Capacity must be a non-negative whole number."));
    }
    if (num > MAX_CAPACITY) {
        return (0, result_1.Err)((0, errors_1.InvalidCapacity)(`Capacity must be at most ${MAX_CAPACITY}.`));
    }
    return (0, result_1.Ok)(num);
}
function parseInvitedEmails(raw) {
    if (!raw)
        return [];
    // Split by comma or newline, then trim each and filter empty
    return raw.split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
}
class EventService {
    repo;
    rsvpRepo;
    constructor(repo, rsvpRepo) {
        this.repo = repo;
        this.rsvpRepo = rsvpRepo;
    }
    async createEvent(input, organizer) {
        const titleErr = validateTitle(input.title);
        if (titleErr)
            return (0, result_1.Err)(titleErr);
        const descErr = validateDescription(input.description);
        if (descErr)
            return (0, result_1.Err)(descErr);
        const locErr = validateLocation(input.location);
        if (locErr)
            return (0, result_1.Err)(locErr);
        const catErr = validateCategory(input.category);
        if (catErr)
            return (0, result_1.Err)(catErr);
        const startResult = parseAndValidateDate(input.startDate, "Start date");
        if (startResult.ok === false)
            return (0, result_1.Err)(startResult.value);
        const startDate = startResult.value;
        const endResult = parseAndValidateDate(input.endDate, "End date");
        if (endResult.ok === false)
            return (0, result_1.Err)(endResult.value);
        const endDate = endResult.value;
        const rangeErr = validateDateRange(startDate, endDate);
        if (rangeErr)
            return (0, result_1.Err)(rangeErr);
        const capResult = parseAndValidateCapacity(input.capacity);
        if (capResult.ok === false)
            return (0, result_1.Err)(capResult.value);
        const capacity = capResult.value;
        const isPrivate = input.isPrivate === "on" || input.isPrivate === "true" || input.isPrivate === true;
        const invitedEmails = parseInvitedEmails(input.invitedEmails);
        const now = new Date().toISOString();
        const event = {
            id: (0, node_crypto_1.randomUUID)(),
            title: input.title.trim(),
            description: input.description.trim(),
            location: input.location.trim(),
            category: input.category.trim(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            organizerId: organizer.userId,
            organizerName: organizer.displayName,
            status: "draft",
            capacity,
            attendeeCount: 0,
            isPrivate,
            invitedEmails,
            createdAt: now,
            updatedAt: now,
        };
        const created = await this.repo.create(event);
        if (created.ok === false)
            return (0, result_1.Err)(created.value);
        this.logger.info(`Event created: id=${event.id}, isPrivate=${event.isPrivate}, invitedCount=${event.invitedEmails.length}`);
        return (0, result_1.Ok)((0, Event_1.toEventSummary)(created.value));
    }
    async getEventDetails(eventId, currentUser) {
        const eventResult = await this.repo.findById(eventId);
        if (eventResult.ok === false) {
            return (0, result_1.Err)(eventResult.value);
        }
        const event = eventResult.value;
        if (!event) {
            return (0, result_1.Err)((0, errors_1.EventNotFound)("Event not found."));
        }
        if (event.status === "draft") {
            const isOwner = currentUser?.userId === event.organizerId;
            const isAdmin = currentUser?.role === "admin";
            if (!isOwner && !isAdmin) {
                return (0, result_1.Err)((0, errors_1.EventNotFound)("Event not found."));
            }
        }
        if (event.isPrivate) {
            const isOwner = currentUser?.userId === event.organizerId;
            const isStaffOrAdmin = currentUser?.role === "admin" || currentUser?.role === "staff";
            const isInvited = currentUser && event.invitedEmails.some(e => e.toLowerCase() === currentUser.email.toLowerCase());
            if (!isOwner && !isStaffOrAdmin && !isInvited) {
                this.logger.warn(`Access denied to private event ${eventId} for user ${currentUser?.email ?? "anonymous"}`);
                return (0, result_1.Err)((0, errors_1.EventNotFound)("Event not found."));
            }
        }
        return (0, result_1.Ok)(event);
    }
    async listVisibleEvents(currentUser, query, category, timeframe) {
        const queryErr = validateSearchQuery(query);
        if (queryErr)
            return (0, result_1.Err)(queryErr);
        const categoryErr = validateFilterCategory(category ?? "");
        if (categoryErr)
            return (0, result_1.Err)(categoryErr);
        const timeframeErr = validateFilterTimeframe(timeframe ?? "");
        if (timeframeErr)
            return (0, result_1.Err)(timeframeErr);
        const allResult = await this.repo.findAll();
        if (allResult.ok === false)
            return (0, result_1.Err)(allResult.value);
        const now = new Date();
        const trimmedQuery = query.trim().toLowerCase();
        const trimmedCategory = (category ?? "").trim().toLowerCase();
        const trimmedTimeframe = (timeframe ?? "").trim().toLowerCase();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfToday);
        const daysUntilSunday = (7 - endOfWeek.getDay()) % 7;
        endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
        endOfWeek.setHours(23, 59, 59, 999);
        const saturday = new Date(startOfToday);
        const daysUntilSaturday = (6 - saturday.getDay() + 7) % 7;
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        saturday.setHours(0, 0, 0, 0);
        const sunday = new Date(saturday);
        sunday.setDate(sunday.getDate() + 1);
        sunday.setHours(23, 59, 59, 999);
        const visibleEvents = allResult.value.filter((event) => {
            const isOwner = currentUser?.userId === event.organizerId;
            const isAdmin = currentUser?.role === "admin";
            const isStaffOrAdmin = currentUser?.role === "admin" || currentUser?.role === "staff";
            if (event.status === "draft") {
                if (!isOwner && !isAdmin) {
                    return false;
                }
            }
            else if (event.status !== "published") {
                return false;
            }
            if (event.isPrivate) {
                const isInvited = currentUser && event.invitedEmails.some(e => e.toLowerCase() === currentUser.email.toLowerCase());
                if (!isOwner && !isStaffOrAdmin && !isInvited) {
                    return false;
                }
            }
            const eventStart = new Date(event.startDate);
            if (eventStart < now) {
                return false;
            }
            if (trimmedQuery) {
                const matchesQuery = event.title.toLowerCase().includes(trimmedQuery) ||
                    event.description.toLowerCase().includes(trimmedQuery) ||
                    event.location.toLowerCase().includes(trimmedQuery);
                if (!matchesQuery) {
                    return false;
                }
            }
            if (trimmedCategory && event.category.toLowerCase() !== trimmedCategory) {
                return false;
            }
            if (trimmedTimeframe === "this-week") {
                if (eventStart < startOfToday || eventStart > endOfWeek) {
                    return false;
                }
            }
            else if (trimmedTimeframe === "this-weekend") {
                if (eventStart < saturday || eventStart > sunday) {
                    return false;
                }
            }
            return true;
        });
        visibleEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        return (0, result_1.Ok)(visibleEvents);
    }
    async publishEvent(eventId, currentUser) {
        const eventResult = await this.repo.findById(eventId);
        if (eventResult.ok === false)
            return (0, result_1.Err)(eventResult.value);
        const event = eventResult.value;
        if (!event)
            return (0, result_1.Err)((0, errors_1.EventNotFound)("Event not found."));
        // Auth check first — before any state checks
        const isOwner = currentUser?.userId === event.organizerId;
        const isAdmin = currentUser?.role === "admin";
        if (!isOwner && !isAdmin) {
            return (0, result_1.Err)((0, errors_1.EventNotAuthorized)("You do not have permission to publish this event."));
        }
        // State check after auth
        if (event.status !== "draft") {
            return (0, result_1.Err)((0, errors_1.EventInvalidState)("Only draft events can be published."));
        }
        event.status = "published";
        event.updatedAt = new Date().toISOString();
        const updateResult = await this.repo.update(event);
        if (updateResult.ok === false)
            return (0, result_1.Err)(updateResult.value);
        return (0, result_1.Ok)((0, Event_1.toEventSummary)(updateResult.value));
    }
    async cancelEvent(eventId, currentUser) {
        const eventResult = await this.repo.findById(eventId);
        if (eventResult.ok === false)
            return (0, result_1.Err)(eventResult.value);
        const event = eventResult.value;
        if (!event)
            return (0, result_1.Err)((0, errors_1.EventNotFound)("Event not found."));
        const isOwner = currentUser?.userId === event.organizerId;
        const isAdmin = currentUser?.role === "admin";
        if (!isOwner && !isAdmin) {
            return (0, result_1.Err)((0, errors_1.EventNotAuthorized)("You do not have permission to cancel this event."));
        }
        if (event.status !== "published") {
            return (0, result_1.Err)((0, errors_1.EventInvalidState)("Only published events can be cancelled."));
        }
        event.status = "cancelled";
        event.updatedAt = new Date().toISOString();
        const updateResult = await this.repo.update(event);
        if (updateResult.ok === false)
            return (0, result_1.Err)(updateResult.value);
        return (0, result_1.Ok)((0, Event_1.toEventSummary)(updateResult.value));
    }
    async updateEvent(eventId, input, currentUser) {
        const eventResult = await this.repo.findById(eventId);
        if (eventResult.ok === false)
            return (0, result_1.Err)(eventResult.value);
        const event = eventResult.value;
        if (!event) {
            return (0, result_1.Err)((0, errors_1.EventNotFound)("Event not found."));
        }
        const isOwner = currentUser?.userId === event.organizerId;
        const isAdmin = currentUser?.role === "admin";
        if (!isOwner && !isAdmin) {
            return (0, result_1.Err)((0, errors_1.EventNotAuthorized)("You do not have permission to edit this event."));
        }
        if (event.status === "cancelled") {
            return (0, result_1.Err)((0, errors_1.EventInvalidState)("Cancelled events cannot be edited."));
        }
        const titleErr = validateTitle(input.title);
        if (titleErr)
            return (0, result_1.Err)(titleErr);
        const descErr = validateDescription(input.description);
        if (descErr)
            return (0, result_1.Err)(descErr);
        const locErr = validateLocation(input.location);
        if (locErr)
            return (0, result_1.Err)(locErr);
        const catErr = validateCategory(input.category);
        if (catErr)
            return (0, result_1.Err)(catErr);
        const startResult = parseAndValidateDate(input.startDate, "Start date");
        if (startResult.ok === false)
            return (0, result_1.Err)(startResult.value);
        const startDate = startResult.value;
        const endResult = parseAndValidateDate(input.endDate, "End date");
        if (endResult.ok === false)
            return (0, result_1.Err)(endResult.value);
        const endDate = endResult.value;
        const rangeErr = validateDateRange(startDate, endDate);
        if (rangeErr)
            return (0, result_1.Err)(rangeErr);
        const capResult = parseAndValidateCapacity(input.capacity);
        if (capResult.ok === false)
            return (0, result_1.Err)(capResult.value);
        const capacity = capResult.value;
        const isPrivate = input.isPrivate === "on" || input.isPrivate === "true" || input.isPrivate === true;
        const invitedEmails = parseInvitedEmails(input.invitedEmails);
        const updatedEvent = {
            ...event,
            title: input.title.trim(),
            description: input.description.trim(),
            location: input.location.trim(),
            category: input.category.trim(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            capacity,
            isPrivate,
            invitedEmails,
            updatedAt: new Date().toISOString(),
        };
        const saveResult = await this.repo.update(updatedEvent);
        if (saveResult.ok === false)
            return (0, result_1.Err)(saveResult.value);
        return (0, result_1.Ok)((0, Event_1.toEventSummary)(saveResult.value));
    }
    async getOrganizerDashboard(currentUser) {
        if (currentUser.role !== "admin" && currentUser.role !== "staff") {
            return (0, result_1.Err)((0, errors_1.EventNotAuthorized)("Members cannot access the organizer dashboard."));
        }
        const eventsResult = currentUser.role === "admin"
            ? await this.repo.findAll()
            : await this.repo.findByOrganizerId(currentUser.userId);
        if (eventsResult.ok === false) {
            return (0, result_1.Err)(eventsResult.value);
        }
        const draft = [];
        const published = [];
        const cancelledOrPast = [];
        for (const event of eventsResult.value) {
            const countResult = await this.rsvpRepo.countGoing(event.id);
            if (countResult.ok === false) {
                return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Could not load attendee count."));
            }
            const item = {
                id: event.id,
                title: event.title,
                category: event.category,
                startDate: event.startDate,
                endDate: event.endDate,
                status: event.status,
                capacity: event.capacity,
                attendeeCount: countResult.value,
                isPrivate: event.isPrivate,
            };
            const isPast = new Date(event.endDate) < new Date();
            if (event.status === "draft") {
                draft.push(item);
            }
            else if (event.status === "published" && !isPast) {
                published.push(item);
            }
            else {
                cancelledOrPast.push(item);
            }
        }
        draft.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        published.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        cancelledOrPast.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        return (0, result_1.Ok)({
            draft,
            published,
            cancelledOrPast,
        });
    }
}
function CreateEventService(repo, rsvpRepo) {
    return new EventService(repo, rsvpRepo);
}
