-- Create Admin User
-- Run this SQL in your PostgreSQL database

INSERT INTO users (phone, name, email, role, is_active)
VALUES (
  '+1234567899',  -- Admin phone number (you can change this)
  'Admin User',
  'admin@example.com',  -- Admin email (you can change this)
  'admin',
  true
);

-- Verify the admin user was created
SELECT id, name, email, phone, role, is_active 
FROM users 
WHERE role = 'admin';

