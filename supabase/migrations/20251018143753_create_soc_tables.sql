/*
  # Create SOC (Standard Occupational Classification) Tables

  1. New Tables
    - `soc_basics`
      - `soc_code` (text, primary key) - SOC occupation code
      - `title` (text) - Occupation title
      - `description` (text) - Occupation description
    
    - `soc_related`
      - `soc_code` (text) - Source SOC code
      - `related_soc_code` (text) - Related SOC code
      - `relatedness_tier` (text) - Tier of relationship
      - Primary key: (soc_code, related_soc_code)
    
    - `soc_ri`
      - `soc_code` (text, primary key) - SOC occupation code
      - `realistic` (real) - Realistic interest score
      - `investigative` (real) - Investigative interest score
      - `artistic` (real) - Artistic interest score
      - `social` (real) - Social interest score
      - `enterprising` (real) - Enterprising interest score
      - `conventional` (real) - Conventional interest score

  2. Security
    - Enable RLS on all tables
    - Add public read-only policies (data is reference information)
    - No write access for users (administrative data)
*/

-- Create soc_basics table
CREATE TABLE IF NOT EXISTS soc_basics (
    soc_code TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL
);

-- Create soc_related table
CREATE TABLE IF NOT EXISTS soc_related (
    soc_code TEXT NOT NULL,
    related_soc_code TEXT NOT NULL,
    relatedness_tier TEXT NOT NULL,
    PRIMARY KEY (soc_code, related_soc_code)
);

-- Create soc_ri table (RIASEC interest scores)
CREATE TABLE IF NOT EXISTS soc_ri (
    soc_code TEXT PRIMARY KEY,
    realistic REAL NOT NULL,
    investigative REAL NOT NULL,
    artistic REAL NOT NULL,
    social REAL NOT NULL,
    enterprising REAL NOT NULL,
    conventional REAL NOT NULL
);

-- Enable Row Level Security
ALTER TABLE soc_basics ENABLE ROW LEVEL SECURITY;
ALTER TABLE soc_related ENABLE ROW LEVEL SECURITY;
ALTER TABLE soc_ri ENABLE ROW LEVEL SECURITY;

-- Create public read-only policies (SOC data is reference information)
CREATE POLICY "Allow public read access to soc_basics"
  ON soc_basics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to soc_related"
  ON soc_related FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to soc_ri"
  ON soc_ri FOR SELECT
  TO public
  USING (true);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_soc_related_soc_code ON soc_related(soc_code);
CREATE INDEX IF NOT EXISTS idx_soc_related_related_code ON soc_related(related_soc_code);
CREATE INDEX IF NOT EXISTS idx_soc_basics_title ON soc_basics(title);
