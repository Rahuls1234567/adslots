-- Seed ro_details table with initial data
-- First, ensure the unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ro_details_media_type_position_key'
  ) THEN
    ALTER TABLE ro_details ADD CONSTRAINT ro_details_media_type_position_key 
    UNIQUE (media_type, position);
  END IF;
END $$;

-- Insert data using ON CONFLICT to avoid duplicates
INSERT INTO ro_details (media_type, position, status, property_prefix) VALUES
('Website', 'Student Homepage', 0, 'WEB'),
('Website', 'Chatpages', 0, 'WEB'),
('Mobile APP', 'Mobile APP', 0, 'APP'),
('Email', 'Email', 0, 'EML'),
('Whatsapp', 'Text Message', 0, 'WAP'),
('Magazine', 'Front Cover Inside', 0, 'MAG'),
('Magazine', 'Back Cover Inside', 0, 'MAG'),
('Magazine', 'Back Cover Outside', 0, 'MAG'),
('Magazine', 'Full Page ( Colour )', 0, 'MAG'),
('Magazine', 'Centre Spread', 0, 'MAG'),
('Magazine', 'Horizontal Strip', 0, 'MAG'),
('Magazine', 'Page Opposite to Front Cover Inside', 0, 'MAG'),
('Magazine', 'Page Opposite to Back Cover inside', 0, 'MAG'),
('Magazine', 'Index Page ( Black & White )', 0, 'MAG'),
('Whatsapp', 'Banner type', 0, 'WAP'),
('Whatsapp', 'Clip Ad', 0, 'WAP'),
('Website', 'Site Homepage', 0, 'WEB'),
('Website', 'Login Page', 0, 'WEB'),
('Website', 'CAT Activity', 0, 'WEB'),
('Website', 'XAT Activity', 0, 'WEB'),
('Website', 'AIMCAT results pages', 0, 'WEB')
ON CONFLICT (media_type, position) DO NOTHING;

