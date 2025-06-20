// server.js - Express server with Supabase
import cors from "cors";
import express from "express";
import {
  addExercise,
  deleteExercise,
  deleteWorkout,
  getAllExercises,
  getAllWorkoutDates,
  getExerciseById,
  getWorkoutByDate,
  saveWorkout,
  updateExercise,
} from "./db.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Single API endpoint that matches your current frontend
app.all("/api/workout", async (req, res) => {
  try {
    const { method, query, body } = req;
    const { action, date, id } = query;

    switch (method) {
      case "GET":
        if (action === "exercises") {
          const exercises = await getAllExercises();
          return res.json(exercises);
        }

        if (action === "exercise" && id) {
          const exercise = await getExerciseById(parseInt(id));
          if (!exercise) {
            return res.status(404).json({ error: "Exercise not found" });
          }
          return res.json(exercise);
        }

        if (action === "workout" && date) {
          const workouts = await getWorkoutByDate(date);
          return res.json(workouts);
        }

        if (action === "dates") {
          const dates = await getAllWorkoutDates();
          return res.json(dates);
        }

        return res
          .status(400)
          .json({ error: "Invalid action or missing parameters" });

      case "POST":
        if (action === "workout" && date) {
          const { exercises } = body;
          if (!exercises || !Array.isArray(exercises)) {
            return res
              .status(400)
              .json({ error: "Exercises array is required" });
          }

          const result = await saveWorkout(date, exercises);
          return res.json(result);
        }

        if (action === "exercise") {
          const { name, gif } = body;
          if (!name || !gif) {
            return res
              .status(400)
              .json({ error: "Name and gif URL are required" });
          }

          const newExercise = await addExercise(name, gif);
          return res.json(newExercise);
        }

        return res
          .status(400)
          .json({ error: "Invalid action or missing parameters" });

      case "PUT":
        if (action === "exercise" && id) {
          const { name, gif } = body;
          if (!name || !gif) {
            return res
              .status(400)
              .json({ error: "Name and gif URL are required" });
          }

          const result = await updateExercise(parseInt(id), name, gif);
          if (!result.updated) {
            return res.status(404).json({ error: "Exercise not found" });
          }
          return res.json(result);
        }

        return res
          .status(400)
          .json({ error: "Invalid action or missing parameters" });

      case "DELETE":
        if (action === "workout" && date) {
          const result = await deleteWorkout(date);
          return res.json(result);
        }

        if (action === "exercise" && id) {
          const result = await deleteExercise(parseInt(id));
          if (!result.deleted) {
            return res.status(404).json({ error: "Exercise not found" });
          }
          return res.json(result);
        }

        return res
          .status(400)
          .json({ error: "Invalid action or missing parameters" });

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    provider: "supabase",
    database: process.env.SUPABASE_URL ? "Connected" : "Not configured",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Supabase URL: ${
      process.env.SUPABASE_URL ? "✅ Configured" : "❌ Not configured"
    }`
  );
  console.log(
    `Supabase Key: ${
      process.env.SUPABASE_ANON_KEY ? "✅ Configured" : "❌ Not configured"
    }`
  );
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
});
