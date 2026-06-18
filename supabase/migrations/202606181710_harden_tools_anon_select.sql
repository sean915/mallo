-- Prevent anonymous Supabase REST clients from reading owner-saved tool data.
-- Shared links are served through /api/viewer with the service role and only expose id/title/html.

begin;

revoke select on table public.tools from anon;
grant select (id, title, html, shared, updated_at) on table public.tools to anon;

commit;
