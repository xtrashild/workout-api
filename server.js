// server.js
import Database from "better-sqlite3";
import cors from "cors";
import express from "express";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup - using better-sqlite3 for simplicity
const dbPath = join(__dirname, "data", "workout.sqlite");

// Ensure data directory exists
if (!fs.existsSync(join(__dirname, "data"))) {
  fs.mkdirSync(join(__dirname, "data"), { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS exercise (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    gif TEXT
  );

  CREATE TABLE IF NOT EXISTS workout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    exercise_id INTEGER NOT NULL,
    duration INTEGER,
    FOREIGN KEY (exercise_id) REFERENCES exercise (id)
  );
`);

// API Routes

// Get all exercises
app.get("/api/exercises", (req, res) => {
  try {
    const exercises = db.prepare("SELECT * FROM exercise ORDER BY id").all();
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exercise by ID
app.get("/api/exercises/:id", (req, res) => {
  try {
    const exercise = db
      .prepare("SELECT * FROM exercise WHERE id = ?")
      .get(req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new exercise
app.post("/api/exercises", (req, res) => {
  try {
    const { name, gif } = req.body;
    const result = db
      .prepare("INSERT INTO exercise (name, gif) VALUES (?, ?)")
      .run(name, gif);
    res.json({ id: result.lastInsertRowid, name, gif });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exercise
app.put("/api/exercises/:id", (req, res) => {
  try {
    const { name, gif } = req.body;
    const result = db
      .prepare("UPDATE exercise SET name = ?, gif = ? WHERE id = ?")
      .run(name, gif, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete exercise
app.delete("/api/exercises/:id", (req, res) => {
  try {
    // Check if exercise is used in workouts
    const workoutCount = db
      .prepare("SELECT COUNT(*) as count FROM workout WHERE exercise_id = ?")
      .get(req.params.id);
    if (workoutCount.count > 0) {
      return res
        .status(400)
        .json({ error: "Cannot delete exercise that is used in workouts" });
    }

    const result = db
      .prepare("DELETE FROM exercise WHERE id = ?")
      .run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workout by date
app.get("/api/workouts/:date", (req, res) => {
  try {
    const workouts = db
      .prepare(
        `
      SELECT w.*, e.name, e.gif 
      FROM workout w
      JOIN exercise e ON w.exercise_id = e.id
      WHERE w.date = ?
      ORDER BY w.id
    `
      )
      .all(req.params.date);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save workout
app.post("/api/workouts", (req, res) => {
  try {
    const { date, exercises } = req.body;

    // Start transaction
    const transaction = db.transaction(() => {
      // Delete existing workout for this date
      db.prepare("DELETE FROM workout WHERE date = ?").run(date);

      // Insert new workout exercises
      const insertStmt = db.prepare(
        "INSERT INTO workout (date, exercise_id, duration) VALUES (?, ?, ?)"
      );
      exercises.forEach((exercise) => {
        insertStmt.run(date, exercise.id, exercise.duration);
      });
    });

    transaction();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all workout dates
app.get("/api/workout-dates", (req, res) => {
  try {
    const dates = db
      .prepare("SELECT DISTINCT date FROM workout ORDER BY date DESC")
      .all();
    res.json(dates.map((row) => row.date));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workout by date
app.delete("/api/workouts/:date", (req, res) => {
  try {
    const result = db
      .prepare("DELETE FROM workout WHERE date = ?")
      .run(req.params.date);
    res.json({ success: true, deletedRows: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
