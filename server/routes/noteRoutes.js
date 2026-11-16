
import { Router } from "express";
import {
  getAllNotes,
  createNote,
   getNoteById,
  updateNote,
  deleteNote,
} from "../services/noteService.js";
import { semanticSearch } from "../services/searchService.js";

const router = Router();

// GET /api/notes
router.get("/", async (req, res) => {
  try {
    const notes = await getAllNotes();
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch notes",
    });
  }
});

// POST /api/notes
router.post("/", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string"
    ) {
      return res.status(400).json({
        message: "A valid title and content are required",
      });
    }

    const note = await createNote({
      title: title.trim(),
      content,
    });

    res.status(201).json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create note",
    });
  }
});


const isValidNote = ({ title, content } = {}) =>
  typeof title === "string" &&
  title.trim().length > 0 &&
  typeof content === "string";



router.get("/semantic-search", async (req, res) => {
  try {
    const query = req.query.q;

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const results = await semanticSearch(query.trim());

    res.json(results);
  } catch (error) {
    console.error("Semantic search error:", error);

    res.status(500).json({
      message: "Semantic search failed",
    });
  }
});


// GET /api/notes/:id
router.get("/:id", async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch note",
    });
  }
});

// PUT /api/notes/:id
router.put("/:id", async (req, res) => {
  try {
    if (!isValidNote(req.body)) {
      return res.status(400).json({
        message: "A valid title and content are required",
      });
    }

    const updatedNote = await updateNote(req.params.id, {
      title: req.body.title.trim(),
      content: req.body.content,
    });

    if (!updatedNote) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json(updatedNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update note",
    });
  }
});

// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteNote(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json({
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to delete note",
    });
  }
});


export default router;
