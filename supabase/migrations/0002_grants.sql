-- Fix for "permission denied for table videos".
-- Newer Supabase projects don't automatically grant table access to the
-- server role. Give it to service_role only (the key the app uses on the server).
-- Safe to run more than once.

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.videos, public.libraries, public.library_videos
  to service_role;
grant execute on function public.reorder_libraries(uuid[]) to service_role;
grant execute on function public.reorder_library_videos(uuid, uuid[]) to service_role;
