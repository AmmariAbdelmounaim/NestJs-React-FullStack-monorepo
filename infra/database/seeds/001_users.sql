-- ===============================================
-- 001_users.sql
-- Seed initial user data
-- ===============================================

-- Note: Admin user is now initialized by the NestJS application on startup
-- See apps/api/src/startup/startup.service.ts

-- Log seed completion
DO $$
BEGIN
    RAISE NOTICE '✓ Users seed file loaded (admin initialization handled by application)';
END $$;

