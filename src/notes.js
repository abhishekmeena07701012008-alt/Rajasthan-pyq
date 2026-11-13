// src/notes.js

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase.js";

const COLLECTION_NAME = "userNotes";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 20000;

/* =========================================
   HELPERS
========================================= */

function validateUserId(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }
}

function validateNoteId(noteId) {
    if (!noteId || typeof noteId !== "string") {
        throw new Error("Valid note ID is required.");
    }
}

function validateNoteData(data) {
    if (!data || typeof data !== "object") {
        throw new Error("Note data is required.");
    }

    const title = String(data.title || "").trim();
    const content = String(data.content || "").trim();

    if (!title) {
        throw new Error("Note title is required.");
    }

    if (title.length > MAX_TITLE_LENGTH) {
        throw new Error(
            `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`
        );
    }

    if (!content) {
        throw new Error("Note content is required.");
    }

    if (content.length > MAX_CONTENT_LENGTH) {
        throw new Error(
            `Content cannot exceed ${MAX_CONTENT_LENGTH} characters.`
        );
    }

    return {
        title,
        content
    };
}

function normalizeDate(value) {
    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeNote(snapshot) {
    const data = snapshot.data();

    return {
        id: snapshot.id,
        ...data,
        createdAt: normalizeDate(data.createdAt),
        updatedAt: normalizeDate(data.updatedAt)
    };
}

/* =========================================
   CREATE NOTE
========================================= */

export async function createNote(userId, noteData) {
    validateUserId(userId);

    const validated = validateNoteData(noteData);

    try {
        const note = {
            userId,

            title: validated.title,
            content: validated.content,

            subjectId: noteData.subjectId || null,
            topicId: noteData.topicId || null,
            subtopicId: noteData.subtopicId || null,

            examId: noteData.examId || null,
            questionId: noteData.questionId || null,

            tags: Array.isArray(noteData.tags)
                ? noteData.tags
                    .filter(tag => typeof tag === "string")
                    .slice(0, 20)
                : [],

            isPinned: Boolean(noteData.isPinned),

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const reference = await addDoc(
            collection(db, COLLECTION_NAME),
            note
        );

        return {
            success: true,
            noteId: reference.id,
            message: "Note created successfully."
        };

    } catch (error) {
        console.error("Create note error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   GET SINGLE NOTE
========================================= */

export async function getNoteById(userId, noteId) {
    validateUserId(userId);
    validateNoteId(noteId);

    try {
        const reference = doc(
            db,
            COLLECTION_NAME,
            noteId
        );

        const snapshot = await getDoc(reference);

        if (!snapshot.exists()) {
            return {
                success: false,
                error: "Note not found."
            };
        }

        const note = normalizeNote(snapshot);

        if (note.userId !== userId) {
            return {
                success: false,
                error: "You cannot access another user's note."
            };
        }

        return {
            success: true,
            note
        };

    } catch (error) {
        console.error("Get note error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   GET ALL USER NOTES
========================================= */

export async function getUserNotes(userId, options = {}) {
    validateUserId(userId);

    const pageSize = Math.min(
        Math.max(
            Number(options.pageSize) || DEFAULT_PAGE_SIZE,
            1
        ),
        MAX_PAGE_SIZE
    );

    try {
        const constraints = [
            where("userId", "==", userId),
            orderBy("updatedAt", "desc"),
            limit(pageSize)
        ];

        if (options.cursor) {
            constraints.splice(
                constraints.length - 1,
                0,
                startAfter(options.cursor)
            );
        }

        const notesQuery = query(
            collection(db, COLLECTION_NAME),
            ...constraints
        );

        const snapshot = await getDocs(notesQuery);

        const notes = snapshot.docs.map(normalizeNote);

        const lastDocument = snapshot.docs.length
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;

        return {
            success: true,
            notes,
            count: notes.length,
            lastDocument,
            hasMore: notes.length === pageSize
        };

    } catch (error) {
        console.error("Get user notes error:", error);

        return {
            success: false,
            notes: [],
            count: 0,
            lastDocument: null,
            hasMore: false,
            error: error.message
        };
    }
}

/* =========================================
   UPDATE NOTE
========================================= */

export async function updateNote(
    userId,
    noteId,
    updates
) {
    validateUserId(userId);
    validateNoteId(noteId);

    if (!updates || typeof updates !== "object") {
        throw new Error("Update data is required.");
    }

    try {
        const reference = doc(
            db,
            COLLECTION_NAME,
            noteId
        );

        const snapshot = await getDoc(reference);

        if (!snapshot.exists()) {
            return {
                success: false,
                error: "Note not found."
            };
        }

        if (snapshot.data().userId !== userId) {
            return {
                success: false,
                error: "You cannot edit another user's note."
            };
        }

        const allowedUpdates = {};

        if (
            Object.prototype.hasOwnProperty.call(
                updates,
                "title"
            )
        ) {
            const title = String(updates.title || "").trim();

            if (!title || title.length > MAX_TITLE_LENGTH) {
                throw new Error("Invalid note title.");
            }

            allowedUpdates.title = title;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                updates,
                "content"
            )
        ) {
            const content = String(
                updates.content || ""
            ).trim();

            if (
                !content ||
                content.length > MAX_CONTENT_LENGTH
            ) {
                throw new Error("Invalid note content.");
            }

            allowedUpdates.content = content;
        }

        const optionalFields = [
            "subjectId",
            "topicId",
            "subtopicId",
            "examId",
            "questionId"
        ];

        optionalFields.forEach(field => {
            if (
                Object.prototype.hasOwnProperty.call(
                    updates,
                    field
                )
            ) {
                allowedUpdates[field] = updates[field] || null;
            }
        });

        if (Array.isArray(updates.tags)) {
            allowedUpdates.tags = updates.tags
                .filter(tag => typeof tag === "string")
                .slice(0, 20);
        }

        if (typeof updates.isPinned === "boolean") {
            allowedUpdates.isPinned = updates.isPinned;
        }

        if (Object.keys(allowedUpdates).length === 0) {
            return {
                success: false,
                error: "No valid fields to update."
            };
        }

        allowedUpdates.updatedAt = serverTimestamp();

        await updateDoc(reference, allowedUpdates);

        return {
            success: true,
            message: "Note updated successfully."
        };

    } catch (error) {
        console.error("Update note error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   DELETE NOTE
========================================= */

export async function deleteNote(userId, noteId) {
    validateUserId(userId);
    validateNoteId(noteId);

    try {
        const reference = doc(
            db,
            COLLECTION_NAME,
            noteId
        );

        const snapshot = await getDoc(reference);

        if (!snapshot.exists()) {
            return {
                success: true,
                deleted: false
            };
        }

        if (snapshot.data().userId !== userId) {
            return {
                success: false,
                error: "You cannot delete another user's note."
            };
        }

        await deleteDoc(reference);

        return {
            success: true,
            deleted: true,
            message: "Note deleted successfully."
        };

    } catch (error) {
        console.error("Delete note error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* =========================================
   PIN / UNPIN NOTE
========================================= */

export async function toggleNotePin(userId, noteId) {
    validateUserId(userId);
    validateNoteId(noteId);

    const result = await getNoteById(userId, noteId);

    if (!result.success) {
        return result;
    }

    return updateNote(userId, noteId, {
        isPinned: !result.note.isPinned
    });
}

/* =========================================
   GET NOTES BY SUBJECT
========================================= */

export async function getNotesBySubject(
    userId,
    subjectId
) {
    validateUserId(userId);

    if (!subjectId) {
        throw new Error("Subject ID is required.");
    }

    try {
        const notesQuery = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("subjectId", "==", subjectId),
            orderBy("updatedAt", "desc")
        );

        const snapshot = await getDocs(notesQuery);

        return {
            success: true,
            notes: snapshot.docs.map(normalizeNote),
            count: snapshot.size
        };

    } catch (error) {
        console.error("Subject notes error:", error);

        return {
            success: false,
            notes: [],
            count: 0,
            error: error.message
        };
    }
}

/* =========================================
   SEARCH NOTES
========================================= */

/**
 * Searches the notes already loaded by the caller.
 * This is client-side text filtering, not a full-text
 * Firestore search.
 */

export function searchNotes(notes = [], searchTerm = "") {
    const term = String(searchTerm).trim().toLowerCase();

    if (!term) {
        return notes;
    }

    return notes.filter(note => {
        const title = String(note.title || "").toLowerCase();
        const content = String(note.content || "").toLowerCase();

        const tags = Array.isArray(note.tags)
            ? note.tags.join(" ").toLowerCase()
            : "";

        return (
            title.includes(term) ||
            content.includes(term) ||
            tags.includes(term)
        );
    });
}

/* =========================================
   GET PINNED NOTES
========================================= */

export function getPinnedNotes(notes = []) {
    return notes.filter(note => note.isPinned === true);
}

/* =========================================
   GET NOTES STATISTICS
========================================= */

export function getNotesStatistics(notes = []) {
    const subjectCounts = {};

    let pinnedCount = 0;

    notes.forEach(note => {
        const subjectId = note.subjectId || "uncategorized";

        subjectCounts[subjectId] =
            (subjectCounts[subjectId] || 0) + 1;

        if (note.isPinned) {
            pinnedCount += 1;
        }
    });

    return {
        totalNotes: notes.length,
        pinnedNotes: pinnedCount,
        subjectCounts
    };
}
