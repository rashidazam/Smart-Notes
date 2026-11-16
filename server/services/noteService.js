
import { randomUUID } from "node:crypto";
import { readNotes, writeNotes } from "./storageService.js";

export async function getAllNotes() {
  return readNotes();
}

export async function createNote({ title, content }) {
  const notes = await readNotes();
  const timestamp = new Date().toISOString();

  const newNote = {
    id: randomUUID(),
    title,
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  notes.push(newNote);
  await writeNotes(notes);

  return newNote;
}

export async function getNoteById(id) {
  const notes = await readNotes();
  return notes.find((note) => note.id === id) ?? null;
}

export async function updateNote(id, { title, content }) {
  const notes = await readNotes();
  const index = notes.findIndex((note) => note.id === id);

  if (index === -1) return null;

  const updated = {
    ...notes[index],
    title,
    content,
    updatedAt: new Date().toISOString(),
  };

  notes[index] = updated;
  await writeNotes(notes);

  return updated;
}

export async function deleteNote(id) {
  const notes = await readNotes();
  const filtered = notes.filter((note) => note.id !== id);

  if (filtered.length === notes.length) return false;

  await writeNotes(filtered);
  return true;
}
