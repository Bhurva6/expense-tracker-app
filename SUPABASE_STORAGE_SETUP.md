# Supabase Storage Setup Guide

If you're getting errors when uploading attachments, follow these steps to configure your Supabase storage bucket:

## Step 1: Create the "expenses" bucket

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Storage** in the left sidebar
4. Click **New bucket**
5. Name it: `expenses`
6. **Check the "Public bucket" checkbox** (important!)
7. Click **Create bucket**

## Step 2: Add Storage Policies

After creating the bucket, you need to add policies to allow uploads:

1. Click on the `expenses` bucket
2. Go to the **Policies** tab
3. Click **New Policy** -> **For full customization**

### Policy 1: Allow uploads (INSERT)

- **Policy name**: `Allow uploads`
- **Allowed operation**: `INSERT`
- **Target roles**: `anon, authenticated`
- **Policy definition**: 
```sql
true
```

### Policy 2: Allow reads (SELECT)

- **Policy name**: `Allow public reads`
- **Allowed operation**: `SELECT`  
- **Target roles**: `anon, authenticated`
- **Policy definition**:
```sql
true
```

### Policy 3: Allow updates (UPDATE)

- **Policy name**: `Allow updates`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
true
```

### Policy 4: Allow deletes (DELETE)

- **Policy name**: `Allow deletes`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
true
```

## Alternative: SQL Commands

You can also run these SQL commands in the SQL Editor:

```sql
-- Create policies for the expenses bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('expenses', 'expenses', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public uploads
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'expenses');

-- Allow public reads
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'expenses');

-- Allow updates
CREATE POLICY "Allow updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'expenses');

-- Allow deletes
CREATE POLICY "Allow deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'expenses');
```

## Troubleshooting

### Error: "Bucket not found"
- Make sure you created a bucket named exactly `expenses`
- Bucket names are case-sensitive

### Error: "row-level security policy" or "permission denied"
- Add the policies described above
- Make sure policies allow `INSERT` for both `anon` and `authenticated` roles

### Error: "File too large"
- The app has a 10MB limit per file
- Supabase free tier has a 50MB file limit

### Error: "Invalid key" or "apikey"
- Check your `.env.local` file has correct values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Get these from Supabase Dashboard > Settings > API

## Verify Your Setup

Open browser console (F12) and check for any error messages when uploading. The app logs detailed information about upload attempts.
