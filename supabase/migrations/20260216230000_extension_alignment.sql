
-- Align Extensions with Production
-- This ensures that local and CI environments have the same extensions as production.

BEGIN;

-- Ensure "extensions" and "graphql" schemas exist if not managed by Supabase
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE SCHEMA IF NOT EXISTS "graphql";

-- Enable extensions in their respective schemas
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
-- pg_net is critical for edge function background triggering from DB
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

COMMIT;
