-- Create the first Admin user
-- Run this SQL in your PostgreSQL database
-- Admin users don't need business details (GST, school name, address)

INSERT INTO users (
  phone, 
  name, 
  email, 
  role,
  is_active
)
VALUES (
  '+919999999999',
  'Admin User',
  'admin@time.com',
  'admin',
  true
);

-- Verify the admin user was created
SELECT id, name, email, phone, role, is_active FROM users WHERE role = 'admin';
