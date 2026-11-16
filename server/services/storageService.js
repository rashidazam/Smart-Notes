
import { readFile, writeFile } from "node:fs/promises";
import { get, put } from "@vercel/blob";

const localPath = new URL("../data/notes.json", import.meta.url);
const blobPath = "smart-notes/notes.json";

const useBlob = () =>
  process.env.STORAGE_PROVIDER === "blob";
export async function readNotes() {
  console.log("STORAGE_PROVIDER:", process.env.STORAGE_PROVIDER);

  if (!useBlob()) {
    console.log("Reading notes from LOCAL JSON");

    const data = await readFile(localPath, "utf8");
    return JSON.parse(data);
  }

  console.log("Reading notes from VERCEL BLOB");

  const blob = await get(blobPath, {
    access: "private",
  });

  if (!blob) return [];

  return await new Response(blob.stream).json();
}

export async function writeNotes(notes) {
  if (!useBlob()) {
    await writeFile(
      localPath,
      JSON.stringify(notes, null, 2),
      "utf8"
    );
    return;
  }

  await put(blobPath, JSON.stringify(notes), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
