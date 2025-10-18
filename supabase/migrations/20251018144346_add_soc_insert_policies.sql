/*
  # Add INSERT policies for SOC tables

  1. Security Changes
    - Add INSERT policies to allow data loading
    - These policies allow public inserts for initial data seeding
    - In production, these should be restricted to service role only
*/

-- Allow public inserts for soc_basics (for data loading)
CREATE POLICY "Allow inserts to soc_basics"
  ON soc_basics FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public inserts for soc_related (for data loading)
CREATE POLICY "Allow inserts to soc_related"
  ON soc_related FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public inserts for soc_ri (for data loading)
CREATE POLICY "Allow inserts to soc_ri"
  ON soc_ri FOR INSERT
  TO public
  WITH CHECK (true);
