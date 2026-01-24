# Supabase Storage Setup for Proof Images

## Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named: `proof-images`
3. Make it **public** (so AI API can access image URLs)

## Bucket Policies

Run these policies in SQL Editor:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload proof images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proof-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access (for AI verification)
CREATE POLICY "Public read access for proof images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proof-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proof-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Folder Structure

Images will be organized as:
```
proof-images/
  ├── {user_id}/
  │   ├── {timestamp}-{random}.png
  │   └── {timestamp}-{random}.jpg
```

## Access URLs

Public URL format:
```
https://{project_ref}.supabase.co/storage/v1/object/public/proof-images/{user_id}/{filename}
```
