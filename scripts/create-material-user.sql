-- First, add the 'material' role to the enum if it doesn't exist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'material';

-- Create a new user with 'material' role
-- Update the values below with actual user details
INSERT INTO users (phone, name, email, role, is_active)
VALUES (
  '+919999999999',  -- Replace with actual phone number
  'Material User',  -- Replace with actual name
  'material@example.com',  -- Replace with actual email
  'material',
  true
);

-- Verify the user was created
SELECT id, name, email, phone, role, is_active 
FROM users 
WHERE role = 'material';

