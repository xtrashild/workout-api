// db.js - Using Supabase JS (REST API approach)
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Database functions using Supabase JS
export async function getAllExercises() {
  const { data, error } = await supabase
    .from("exercise")
    .select("*")
    .order("id");

  if (error) throw error;
  return data;
}

export async function getExerciseById(id) {
  const { data, error } = await supabase
    .from("exercise")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
}

export async function getWorkoutByDate(date) {
  const { data, error } = await supabase
    .from("workout")
    .select(
      `
      *,
      exercise:exercise_id (
        name,
        gif
      )
    `
    )
    .eq("date", date)
    .order("id");

  if (error) throw error;

  // Transform the data to match your expected format
  return data.map((workout) => ({
    ...workout,
    name: workout.exercise.name,
    gif: workout.exercise.gif,
  }));
}

export async function saveWorkout(date, exercises) {
  try {
    // Delete existing workout for this date
    const { error: deleteError } = await supabase
      .from("workout")
      .delete()
      .eq("date", date);

    if (deleteError) throw deleteError;

    // Insert new workout exercises
    const workoutData = exercises.map((exercise) => ({
      date,
      exercise_id: exercise.id,
      duration: exercise.duration,
    }));

    const { error: insertError } = await supabase
      .from("workout")
      .insert(workoutData);

    if (insertError) throw insertError;

    return { success: true };
  } catch (error) {
    throw error;
  }
}

export async function getAllWorkoutDates() {
  const { data, error } = await supabase
    .from("workout")
    .select("date")
    .order("date", { ascending: false });

  if (error) throw error;

  // Get unique dates
  const uniqueDates = [...new Set(data.map((row) => row.date))];
  return uniqueDates;
}

export async function deleteWorkout(date) {
  const { error, count } = await supabase
    .from("workout")
    .delete({ count: "exact" })
    .eq("date", date);

  if (error) throw error;
  return { success: true, deletedRows: count };
}

export async function addExercise(name, gif) {
  const { data, error } = await supabase
    .from("exercise")
    .insert({ name, gif })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExercise(id, name, gif) {
  const { data, error } = await supabase
    .from("exercise")
    .update({ name, gif })
    .eq("id", id)
    .select();

  if (error) throw error;
  return { success: true, updated: data.length > 0 };
}

export async function deleteExercise(id) {
  // Check if exercise is used in workouts
  const { data: workouts, error: checkError } = await supabase
    .from("workout")
    .select("id")
    .eq("exercise_id", id);

  if (checkError) throw checkError;

  if (workouts.length > 0) {
    throw new Error("Cannot delete exercise that is used in workouts");
  }

  const { error, count } = await supabase
    .from("exercise")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  return { success: true, deleted: count > 0 };
}

// Initialize tables function (you'll need to run this SQL manually in Supabase)
export async function initializeTables() {
  console.log(
    "Tables should be created manually in Supabase Dashboard → SQL Editor"
  );
  console.log(`
CREATE TABLE IF NOT EXISTS exercise (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  gif VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS workout (
  id SERIAL PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  exercise_id INTEGER NOT NULL,
  duration INTEGER,
  FOREIGN KEY (exercise_id) REFERENCES exercise(id)
);
  `);
}
