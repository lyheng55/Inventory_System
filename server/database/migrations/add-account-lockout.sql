-- Add account lockout tracking to users table
-- This migration adds fields to track failed login attempts and account lockout

-- Add lockout tracking fields to users table
ALTER TABLE users 
ADD COLUMN failed_login_attempts INT DEFAULT 0,
ADD COLUMN locked_until DATETIME NULL,
ADD COLUMN last_failed_login DATETIME NULL;

-- Create index for performance
CREATE INDEX idx_users_locked_until ON users(locked_until);
CREATE INDEX idx_users_failed_attempts ON users(failed_login_attempts);

-- Update existing users to have default values
UPDATE users SET 
  failed_login_attempts = 0,
  locked_until = NULL,
  last_failed_login = NULL
WHERE failed_login_attempts IS NULL;
