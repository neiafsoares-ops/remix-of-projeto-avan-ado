-- Add is_hidden column to quiz_questions table
ALTER TABLE quiz_questions 
ADD COLUMN is_hidden BOOLEAN DEFAULT false;