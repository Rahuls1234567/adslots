-- First, add the 'material' role to the enum if it doesn't exist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'material';

-- Create Material User
-- Run this SQL in your PostgreSQL database

INSERT INTO users (phone, name, email, role, is_active)
VALUES (
  '+1234567896',  -- Material user phone number (you can change this)
  'Material User',
  'material@example.com',  -- Material user email (you can change this)
  'material',
  true
);

-- Verify the material user was created
SELECT id, name, email, phone, role, is_active 
FROM users 
WHERE role = 'material';

