-- Add tsvector column for full-text search
ALTER TABLE "Content" ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX content_search_idx ON "Content" USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER content_search_vector_update
  BEFORE INSERT OR UPDATE ON "Content"
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_vector();

-- Populate search_vector for existing content
UPDATE "Content" SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(body, '')), 'C');
