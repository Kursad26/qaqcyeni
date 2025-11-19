-- Add documents column to field_training_reports table
-- This allows users to upload training documents (Word, PDF, PowerPoint)
-- Documents are stored in Cloudinary under 'egitim-dokumanlari' folder

ALTER TABLE field_training_reports
ADD COLUMN IF NOT EXISTS documents text[] DEFAULT '{}';

COMMENT ON COLUMN field_training_reports.documents IS 'Array of Cloudinary URLs for training documents (Word, PDF, PPT)';
