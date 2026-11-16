
import { readFile, writeFile } from "node:fs/promises";
import { getAllNotes } from "./noteService.js";
import { generateEmbedding } from "./embeddingService.js";
import { cosineSimilarity } from "../utils/similarity.js";

const indexPath = new URL("../data/embeddings.json", import.meta.url);

async function readIndex() {
  try {
    return JSON.parse(await readFile(indexPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}


async function syncEmbeddings(notes) {
  const existing = await readIndex();

  const existingById = new Map(
    existing.map((item) => [item.id, item])
  );

  const updated = [];
  let hasChanges = false;

  for (const note of notes) {
    const cached = existingById.get(note.id);

    // Reuse existing embedding when note hasn't changed
    if (
      cached &&
      cached.updatedAt === note.updatedAt &&
      Array.isArray(cached.embedding) &&
      cached.embedding.length === 384
    ) {
      updated.push(cached);
      continue;
    }

    // Generate embedding only for new or updated notes
    console.log(`[EMBEDDING] Generating for: ${note.title}`);

    const text = `${note.title}\n${note.content}`;
    const embedding = await generateEmbedding(text);

    updated.push({
      id: note.id,
      updatedAt: note.updatedAt,
      embedding,
    });

    hasChanges = true;
  }

  // Detect deleted notes
  if (existing.length !== updated.length) {
    hasChanges = true;
  }

  // Write only when something changed
  if (hasChanges) {
    await writeFile(
      indexPath,
      JSON.stringify(updated),
      "utf8"
    );

    console.log("[EMBEDDING] Index updated");
  } else {
    console.log("[EMBEDDING] Using cached embeddings");
  }

  return updated;
}


export async function semanticSearch(query, limit = 5) {
  const notes = await getAllNotes();

  if (notes.length === 0) return [];

  const index = await syncEmbeddings(notes);
  const queryEmbedding = await generateEmbedding(query);

  const embeddingById = new Map(
    index.map((item) => [item.id, item.embedding])
  );

  return notes
    .map((note) => ({
      ...note,
      score: cosineSimilarity(
        queryEmbedding,
        embeddingById.get(note.id)
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
