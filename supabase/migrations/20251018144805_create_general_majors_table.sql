/*
  # Create general_majors table for CIP data

  1. New Tables
    - `general_majors`
      - `cip_code` (varchar(10), primary key) - CIP classification code
      - `major_title` (text) - Name of the major/program
      - `major_summary` (text) - Description of the major
      - `family_label` (text) - Family grouping label

  2. Security
    - Enable RLS on `general_majors` table
    - Add SELECT policy for public read access
    - Add INSERT policy for data loading
*/

DROP TABLE IF EXISTS general_majors;

CREATE TABLE general_majors (
    cip_code VARCHAR(10) PRIMARY KEY,
    major_title TEXT NOT NULL,
    major_summary TEXT,
    family_label TEXT
);

ALTER TABLE general_majors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to general_majors"
  ON general_majors
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow inserts to general_majors"
  ON general_majors
  FOR INSERT
  TO public
  WITH CHECK (true);
