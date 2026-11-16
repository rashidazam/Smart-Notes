
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

const API_URL = `${API_BASE_URL}/api/notes`;

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Something went wrong");
  }

  // Handle successful responses without a JSON body
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// GET - Fetch all notes
export async function fetchNotes() {
  const response = await fetch(API_URL);
  return handleResponse(response);
}

// POST - Create a note
export async function createNote(note) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(note),
  });

  return handleResponse(response);
}

// PUT - Update a note
export async function updateNote({ id, ...note }) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(note),
  });

  return handleResponse(response);
}

// DELETE - Delete a note
export async function deleteNote(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}

// Semantic search - Temporarily retained
export async function searchNotesSemantically(query, signal) {
  const params = new URLSearchParams({ q: query });

  const response = await fetch(
    `${API_URL}/semantic-search?${params}`,
    { signal }
  );

  return handleResponse(response);
}
