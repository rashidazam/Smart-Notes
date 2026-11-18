
import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotesSemantically,
} from "./api/notesApi";

import { useDebounce } from "./hooks/useDebounce";
import "./App.css";

const emptyForm = { title: "", content: "" };

function App() {
  const queryClient = useQueryClient();

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  // Search state
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState("title");

  const debouncedSearch = useDebounce(search.trim(), 600);

  const isSemanticMode = searchMode === "semantic";
  const hasSearchText = search.trim().length > 0;

  const isSemanticSearchActive =
    isSemanticMode && debouncedSearch.length >= 3;

  const isWaitingForDebounce =
    isSemanticMode &&
    hasSearchText &&
    search.trim() !== debouncedSearch;

  const isTooShort =
    isSemanticMode &&
    hasSearchText &&
    search.trim().length < 3;

  // Fetch all notes
  const {
    data: notes = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
  });

  // Semantic search query
  const semanticQuery = useQuery({
    queryKey: ["semantic-search", debouncedSearch],
    queryFn: ({ signal }) =>
      searchNotesSemantically(debouncedSearch, signal),
    enabled: isSemanticSearchActive,
    retry: false,
    staleTime: 60 * 1000,
  });

  // Invalidate cached data after mutations
  const refreshNotes = () => {
    queryClient.invalidateQueries({
      queryKey: ["notes"],
    });

    queryClient.invalidateQueries({
      queryKey: ["semantic-search"],
    });
  };

  // Reset create/edit form
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      refreshNotes();
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateNote,
    onSuccess: () => {
      refreshNotes();
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      refreshNotes();
      resetForm();
    },
  });

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  // Create or update a note
  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Title is required");
      return;
    }

    const payload = {
      title: form.title.trim(),
      content: form.content,
    };

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Edit note
  function handleEdit(note) {
    setEditingId(note.id);

    setForm({
      title: note.title,
      content: note.content,
    });

    setFormError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // Delete note
  function handleDelete(id) {
    if (
      window.confirm(
        "Are you sure you want to delete this note?"
      )
    ) {
      deleteMutation.mutate(id);
    }
  }

  // Select notes based on search mode
  const filteredNotes = isSemanticMode
    ? isSemanticSearchActive && !isWaitingForDebounce
      ? semanticQuery.data ?? []
      : []
    : notes.filter((note) =>
        note.title.toLowerCase().includes(search.toLowerCase())
      );

  const isSearchLoading =
    isSemanticMode &&
    hasSearchText &&
    !isTooShort &&
    (isWaitingForDebounce ||
      (isSemanticSearchActive && semanticQuery.isPending));

  const isSearchError =
    isSemanticSearchActive &&
    !isWaitingForDebounce &&
    semanticQuery.isError;

  return (
    <main className="app">
      {/* Header */}
      <header className="app-header">
        <div>
          <h1>Smart Notes</h1>
          <p>Capture ideas. Find them later.</p>
        </div>

        <span className="note-count">
          {notes.length} notes
        </span>
      </header>

      {/* Create / Edit Form */}
      <section className="editor">
        <h2>
          {editingId ? "Edit Note" : "Create Note"}
        </h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="title">Title</label>

          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            placeholder="Enter note title"
          />

          <label htmlFor="content">Content</label>

          <textarea
            id="content"
            rows="5"
            value={form.content}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                content: e.target.value,
              }))
            }
            placeholder="Write your note..."
          />

          {formError && (
            <p className="error">
              {formError}
            </p>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : editingId
                ? "Update Note"
                : "Create Note"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          {(createMutation.isError ||
            updateMutation.isError) && (
            <p className="error">
              {createMutation.error?.message ||
                updateMutation.error?.message}
            </p>
          )}
        </form>
      </section>

      {/* Notes List */}
      <section className="notes-section">
        <div className="notes-toolbar">
          <h2>My Notes</h2>

          {/* Search mode selector */}
          {/* <select
            aria-label="Search mode"
            value={searchMode}
            onChange={(e) =>
              setSearchMode(e.target.value)
            }
          >
            <option value="title">
              Title Search
            </option>

            <option value="semantic">
              Semantic Search
            </option>
          </select> */}

          Search input
          <input
            type="search"
            aria-label="Search notes"
            placeholder={
              isSemanticMode
                ? "Search notes by meaning..."
                : "Search notes by title..."
            }
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        {/* Notes loading state */}
        {isPending && (
          <p>Loading notes...</p>
        )}

        {/* Notes fetch error */}
        {isError && (
          <p className="error">
            {error.message}
          </p>
        )}

        {/* Semantic search minimum length */}
        {isTooShort && (
          <p>
            Enter at least 3 characters for semantic search.
          </p>
        )}

        {/* Semantic search loading */}
        {isSearchLoading && (
          <p>Searching by meaning...</p>
        )}

        {/* Semantic search error */}
        {isSearchError && (
          <p className="error">
            {semanticQuery.error.message}
          </p>
        )}

        {/* Delete error */}
        {deleteMutation.isError && (
          <p className="error">
            {deleteMutation.error.message}
          </p>
        )}

        {/* Notes grid */}
        {!isPending &&
          !isError &&
          !isSearchLoading &&
          !isSearchError &&
          !isTooShort && (
            <div className="notes-grid">
              {filteredNotes.length === 0 ? (
                <p>
                  {isSemanticMode && !hasSearchText
                    ? "Enter a query to search notes by meaning."
                    : "No matching notes found."}
                </p>
              ) : (
                filteredNotes.map((note) => (
                  <article
                    className="note-card"
                    key={note.id}
                  >
                    <h3>{note.title}</h3>

                    <p>{note.content}</p>

                    {/* Similarity score */}
                    {isSemanticMode &&
                      typeof note.score === "number" && (
                        <p className="similarity-score">
                          Similarity:{" "}
                          {(note.score * 100).toFixed(1)}%
                        </p>
                      )}

                    <div className="card-actions">
                      <button
                        className="secondary"
                        onClick={() =>
                          handleEdit(note)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="danger"
                        disabled={
                          deleteMutation.isPending
                        }
                        onClick={() =>
                          handleDelete(note.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
      </section>
    </main>
  );
}

export default App;
