-- Make business-logos bucket public so logo URLs load in <img> tags and PDF previews
update storage.buckets set public = true where id = 'business-logos';

-- Drop the old owner-scoped select policy and replace with public read
drop policy if exists "logos: select own" on storage.objects;

create policy "logos: public read" on storage.objects for select
  using (bucket_id = 'business-logos');
