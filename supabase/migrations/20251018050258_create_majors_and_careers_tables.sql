/*
  # Create Pathfinder Majors and Careers Tables

  ## Overview
  This migration creates the core database schema for the Pathfinder AI career guidance application.
  It establishes tables for storing major and career information that will be matched to student profiles.

  ## New Tables

  ### `majors`
  Stores information about college majors that students can explore.
  - `id` (uuid, primary key) - Unique identifier for each major
  - `name` (text) - Name of the major (e.g., "Computer Science", "Psychology")
  - `description` (text) - Brief overview of what the major involves
  - `typical_coursework` (text) - Common courses and subject areas in this major
  - `key_skills` (text[]) - Array of skills developed in this major
  - `personality_traits` (text[]) - Personality types that typically thrive in this major
  - `values_alignment` (text[]) - Core values that align with this major
  - `created_at` (timestamptz) - Timestamp of record creation

  ### `careers`
  Stores information about career paths related to majors.
  - `id` (uuid, primary key) - Unique identifier for each career
  - `name` (text) - Career title (e.g., "Software Engineer", "Clinical Psychologist")
  - `description` (text) - Overview of the career role
  - `related_major_ids` (uuid[]) - Array of major IDs this career relates to
  - `salary_range` (text) - Expected salary range (e.g., "$60k-$90k", "$80k-$120k")
  - `job_outlook` (text) - Growth prospects and demand (e.g., "High growth", "Stable")
  - `required_skills` (text[]) - Key skills needed for this career
  - `work_environment` (text) - Description of typical work settings
  - `next_steps` (text) - Actionable advice for pursuing this career
  - `created_at` (timestamptz) - Timestamp of record creation

  ## Security
  - Enable Row Level Security (RLS) on both tables
  - Add policies allowing public read access (no authentication required for MVP)
  - This allows the app to query data without user accounts
  - Future versions can add write restrictions and user-specific data

  ## Notes
  - Tables use UUID primary keys for scalability
  - Array fields support multiple values for flexible matching
  - Design supports future API-based top-k retrieval and semantic search
  - All text fields can be indexed for full-text search if needed
*/

-- Create majors table
CREATE TABLE IF NOT EXISTS majors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  typical_coursework text NOT NULL,
  key_skills text[] DEFAULT '{}',
  personality_traits text[] DEFAULT '{}',
  values_alignment text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create careers table
CREATE TABLE IF NOT EXISTS careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  related_major_ids uuid[] DEFAULT '{}',
  salary_range text NOT NULL,
  job_outlook text NOT NULL,
  required_skills text[] DEFAULT '{}',
  work_environment text NOT NULL,
  next_steps text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE careers ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (MVP - no auth required)
CREATE POLICY "Allow public read access to majors"
  ON majors
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to careers"
  ON careers
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_majors_name ON majors(name);
CREATE INDEX IF NOT EXISTS idx_careers_name ON careers(name);
CREATE INDEX IF NOT EXISTS idx_careers_related_majors ON careers USING GIN(related_major_ids);
