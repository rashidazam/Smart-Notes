
const API_URL = "/api/notes";

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Something went wrong");
  }

  return response.json();
}

export async function fetchNotes() {
  const response = await fetch(API_URL);
  return handleResponse(response);
}

export async function createNote(note) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });

  return handleResponse(response);
}

export async function updateNote({ id, ...note }) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });

  return handleResponse(response);
}

export async function deleteNote(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}


export async function searchNotesSemantically(query, signal) {
  const params = new URLSearchParams({ q: query });

  const response = await fetch(
    `/api/notes/semantic-search?${params}`,
    { signal }
  );

  return handleResponse(response);
}


