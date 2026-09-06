-- Initial database setup for Talk to Earn
-- This file runs automatically when the PostgreSQL container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial schema version tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial migration record
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Initial database setup')
ON CONFLICT (version) DO NOTHING;

-- Create indexes for common query patterns
-- Note: Full schema will be created via migrations

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization complete';
END $$;
