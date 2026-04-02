-- ================================================================
-- Migration 017: Add FK from reviews.user_id to profiles.id
-- ================================================================
-- The reviews table originally only referenced auth.users(id) for user_id.
-- PostgREST requires an explicit FK relationship to join tables, so
-- queries like `.select('*, profiles(full_name)')` fail without this FK.
--
-- This is safe because profiles.id = auth.users.id (profiles are
-- auto-created via the handle_new_user trigger in migration 001).
-- ================================================================

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
