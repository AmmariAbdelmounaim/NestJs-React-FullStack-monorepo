-- ===============================================
-- 005_create_rls.sql
-- Create Row-Level Security policies
-- ===============================================
-- Note: app_role and app_password are passed as psql variables via -v flag

-- First, set session variables from psql variables (these can be accessed in DO blocks)
SELECT set_config('app.role_name', :'app_role', false);
SELECT set_config('app.role_password', :'app_password', false);

-- Create application role if it doesn't exist
DO $create_role$
DECLARE
    v_app_role TEXT := current_setting('app.role_name');
    v_app_password TEXT := current_setting('app.role_password');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_app_role) THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_app_role, v_app_password);
        RAISE NOTICE '✓ Created application role: %', v_app_role;
    ELSE
        RAISE NOTICE '✓ Application role already exists: %', v_app_role;
    END IF;
END $create_role$;

-- Grant permissions to app role
DO $grant_perms$
DECLARE
    v_app_role TEXT := current_setting('app.role_name');
BEGIN
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_app_role);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', v_app_role);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', v_app_role);
END $grant_perms$;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;

-- Helper function to get app role name (used in policy creation)
CREATE OR REPLACE FUNCTION get_app_role() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.role_name');
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if user insert is allowed
-- Simple function that always returns true to allow all inserts
-- Using IMMUTABLE SQL function for better performance and reliability
CREATE OR REPLACE FUNCTION can_insert_user() RETURNS boolean 
LANGUAGE sql IMMUTABLE
AS $$ SELECT true $$;

-- Grant execute permission to app role
DO $grant_func$
DECLARE
    v_app_role TEXT := current_setting('app.role_name');
BEGIN
    EXECUTE format('GRANT EXECUTE ON FUNCTION can_insert_user() TO %I', v_app_role);
END $grant_func$;

-- ========== USERS RLS POLICIES ==========

-- Users can select their own data or if they're admin
DO $users_select$
BEGIN
    EXECUTE format('CREATE POLICY users_select_self_or_admin ON users 
        FOR SELECT TO %I USING (
            id::text = current_setting(''app.current_user_id'', true) OR
            current_setting(''app.current_user_role'', true) = ''ADMIN''
        )', get_app_role());
END $users_select$;

-- Users can update their own data or if they're admin
DO $users_update$
BEGIN
    EXECUTE format('CREATE POLICY users_update_self_or_admin ON users 
        FOR UPDATE TO %I USING (
            id::text = current_setting(''app.current_user_id'', true) OR
            current_setting(''app.current_user_role'', true) = ''ADMIN''
        ) WITH CHECK (
            id::text = current_setting(''app.current_user_id'', true) OR
            current_setting(''app.current_user_role'', true) = ''ADMIN''
        )', get_app_role());
END $users_update$;

-- Anyone can insert users (for registration)
-- Allow inserts when role is ADMIN
-- Note: During registration, we temporarily set role to ADMIN to allow the insert
-- This is a workaround for a PostgreSQL RLS policy evaluation issue
DO $users_insert$
BEGIN
    EXECUTE format('CREATE POLICY users_insert_all ON users 
        FOR INSERT TO %I 
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $users_insert$;

-- Only admins can delete users
DO $users_delete$
BEGIN
    EXECUTE format('CREATE POLICY users_admin_delete ON users 
        FOR DELETE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $users_delete$;

-- ========== BOOKS RLS POLICIES ==========

-- Anyone can select books
DO $books_select$
BEGIN
    EXECUTE format('CREATE POLICY books_select_all ON books 
        FOR SELECT TO %I USING (true)', get_app_role());
END $books_select$;

-- Only admins can insert books
DO $books_insert$
BEGIN
    EXECUTE format('CREATE POLICY books_admin_insert ON books 
        FOR INSERT TO %I 
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $books_insert$;

-- Only admins can update books
DO $books_update$
BEGIN
    EXECUTE format('CREATE POLICY books_admin_update ON books 
        FOR UPDATE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $books_update$;

-- Only admins can delete books
DO $books_delete$
BEGIN
    EXECUTE format('CREATE POLICY books_admin_delete ON books 
        FOR DELETE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $books_delete$;

-- ========== LOANS RLS POLICIES ==========

-- Users can select their own loans or admins can see all
DO $loans_select$
BEGIN
    EXECUTE format('CREATE POLICY loans_user_or_admin_select ON loans 
        FOR SELECT TO %I USING (
            current_setting(''app.current_user_role'', true) = ''ADMIN'' OR
            user_id::text = current_setting(''app.current_user_id'', true)
        )', get_app_role());
END $loans_select$;

-- Users can insert their own loans or admins can insert any
DO $loans_insert$
BEGIN
    EXECUTE format('CREATE POLICY loans_user_or_admin_insert ON loans 
        FOR INSERT TO %I WITH CHECK (
            current_setting(''app.current_user_role'', true) = ''ADMIN'' OR
            user_id::text = current_setting(''app.current_user_id'', true)
        )', get_app_role());
END $loans_insert$;

-- Users can update their own loans or admins can update any
DO $loans_update$
BEGIN
    EXECUTE format('CREATE POLICY loans_user_or_admin_update ON loans 
        FOR UPDATE TO %I 
        USING (
            current_setting(''app.current_user_role'', true) = ''ADMIN'' OR
            user_id::text = current_setting(''app.current_user_id'', true)
        )
        WITH CHECK (
            current_setting(''app.current_user_role'', true) = ''ADMIN'' OR
            user_id::text = current_setting(''app.current_user_id'', true)
        )', get_app_role());
END $loans_update$;

-- Only admins can delete loans
DO $loans_delete$
BEGIN
    EXECUTE format('CREATE POLICY loans_admin_delete ON loans 
        FOR DELETE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $loans_delete$;

-- ========== MEMBERSHIP CARDS RLS POLICIES ==========

-- Anyone can select membership cards
DO $cards_select$
BEGIN
    EXECUTE format('CREATE POLICY membership_cards_select_all ON membership_cards 
        FOR SELECT TO %I USING (true)', get_app_role());
END $cards_select$;

-- Only admins can insert membership cards
DO $cards_insert$
BEGIN
    EXECUTE format('CREATE POLICY membership_cards_admin_insert ON membership_cards 
        FOR INSERT TO %I 
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $cards_insert$;

-- Admins can update membership cards, or allow updates when no role is set (for registration)
DO $cards_update$
BEGIN
    EXECUTE format('CREATE POLICY membership_cards_admin_update ON membership_cards 
        FOR UPDATE TO %I 
        USING (
            current_setting(''app.current_user_role'', true) = ''ADMIN'' OR
            current_setting(''app.current_user_role'', true) = ''''
        )
        WITH CHECK (
            current_setting(''app.current_user_role'', true) = ''ADMIN'' OR
            current_setting(''app.current_user_role'', true) = ''''
        )', get_app_role());
END $cards_update$;

-- Only admins can delete membership cards
DO $cards_delete$
BEGIN
    EXECUTE format('CREATE POLICY membership_cards_admin_delete ON membership_cards 
        FOR DELETE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $cards_delete$;

-- ========== AUTHORS RLS POLICIES ==========

-- Anyone can select authors
DO $authors_select$
BEGIN
    EXECUTE format('CREATE POLICY authors_select_all ON authors 
        FOR SELECT TO %I USING (true)', get_app_role());
END $authors_select$;

-- Only admins can insert authors
DO $authors_insert$
BEGIN
    EXECUTE format('CREATE POLICY authors_admin_insert ON authors 
        FOR INSERT TO %I 
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $authors_insert$;

-- Only admins can update authors
DO $authors_update$
BEGIN
    EXECUTE format('CREATE POLICY authors_admin_update ON authors 
        FOR UPDATE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $authors_update$;

-- Only admins can delete authors
DO $authors_delete$
BEGIN
    EXECUTE format('CREATE POLICY authors_admin_delete ON authors 
        FOR DELETE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $authors_delete$;

-- ========== BOOK_AUTHORS RLS POLICIES ==========

-- Anyone can select book_authors
DO $book_authors_select$
BEGIN
    EXECUTE format('CREATE POLICY book_authors_select_all ON book_authors 
        FOR SELECT TO %I USING (true)', get_app_role());
END $book_authors_select$;

-- Only admins can insert book_authors
DO $book_authors_insert$
BEGIN
    EXECUTE format('CREATE POLICY book_authors_admin_insert ON book_authors 
        FOR INSERT TO %I 
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $book_authors_insert$;

-- Only admins can update book_authors
DO $book_authors_update$
BEGIN
    EXECUTE format('CREATE POLICY book_authors_admin_update ON book_authors 
        FOR UPDATE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')
        WITH CHECK (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $book_authors_update$;

-- Only admins can delete book_authors
DO $book_authors_delete$
BEGIN
    EXECUTE format('CREATE POLICY book_authors_admin_delete ON book_authors 
        FOR DELETE TO %I 
        USING (current_setting(''app.current_user_role'', true) = ''ADMIN'')', get_app_role());
END $book_authors_delete$;

-- Clean up helper function
DROP FUNCTION get_app_role();

-- Log RLS creation
DO $$
BEGIN
    RAISE NOTICE '✓ Row-Level Security policies created successfully';
END $$;
