-- Private storage buckets for all five modules. No storage.objects
-- policies: only the server (service role) reads and writes; clients
-- get short-lived signed URLs minted after actor authorization.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('plans', 'plans', false, 31457280, array['application/pdf']),
  ('docs', 'docs', false, 31457280,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('signatures', 'signatures', false, 2097152, array['image/png']),
  ('reports', 'reports', false, 31457280, array['application/pdf'])
on conflict (id) do nothing;
