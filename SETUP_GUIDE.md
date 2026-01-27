# 🚀 Complete Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: `employee-brand-engagement` (or any name)
   - **Database Password**: (save this password)
   - **Region**: Choose closest to your location
4. Wait for project to be created (~2 minutes)

## Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGc...` (long key)
   - **service_role** key: `eyJhbGc...` (different long key, keep it SECRET!)

## Step 3: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `schema.sql` file
4. Click **Run** (or press Ctrl/Cmd + Enter)
5. You should see "Success. No rows returned"

## Step 4: Set Up Storage

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it: `proof-images`
4. Make it **Public** (check the checkbox)
5. Click **Create bucket**

### Set Storage Policies

1. Click on the `proof-images` bucket
2. Click **Policies** tab
3. Click **New Policy** → **Custom**
4. Add these 3 policies:

**Policy 1: Allow Upload**
- Name: `Users can upload proof images`
- Policy Command: `INSERT`
- Target Roles: `authenticated`
- USING expression:
```sql
bucket_id = 'proof-images'
```

**Policy 2: Allow Public Read**
- Name: `Public read access`
- Policy Command: `SELECT`
- Target Roles: `public`
- USING expression:
```sql
bucket_id = 'proof-images'
```

**Policy 3: Allow Delete**
- Name: `Users can delete own images`
- Policy Command: `DELETE`
- Target Roles: `authenticated`
- USING expression:
```sql
bucket_id = 'proof-images'
```

## Step 5: Configure Environment Variables

1. In the project folder, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in your values:

```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key...

# AI Verification API (use the Start endpoint; app will poll Status internally)
AI_VERIFICATION_API_URL=https://ai-core-dev.phinite.ai/trigger/start/QZ-3DDP/16qObTjWO/development
AI_VERIFICATION_API_KEY=your_api_key_here

# JWT Secret (generate random string)
JWT_SECRET=change_this_to_a_long_random_string_123456

# Admin Email
ADMIN_EMAIL=ashish.deekonda@phinite.ai
```

**How to generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 8: Test the Application

1. **Register an Account**:
   - Go to http://localhost:3000
   - Click "Sign up"
   - Use email: `ashish.deekonda@phinite.ai` (this becomes admin)
   - Password: minimum 6 characters
   - Name: Your name

2. **Submit a Proof**:
   - Select an activity type (Like, Comment, etc.)
   - Upload a LinkedIn screenshot
   - Add optional notes
   - Click "Submit Proof"

3. **Check Verification**:
   - If confidence >= 0.8: Auto-approved ✅
   - If confidence < 0.8: Manual review needed 🔍
   - Check your points on dashboard

4. **View Leaderboard**:
   - Click "Leaderboard" tab
   - See monthly rankings

5. **Admin Panel** (only for admin email):
   - Click "Admin" tab
   - Review pending submissions
   - Approve or reject manually

## Step 9: Deploy to Production

### Option A: Deploy to Vercel (Recommended)

1. Push code to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Add Environment Variables (same as `.env.local`)
6. Click "Deploy"
7. Your app will be live at `https://your-project.vercel.app`

### Option B: Deploy to Netlify

1. Push code to GitHub
2. Go to https://netlify.com
3. Click "Add new site" → "Import an existing project"
4. Connect GitHub and select repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add Environment Variables
7. Click "Deploy"

## Troubleshooting

### "supabaseUrl is required" error
- Make sure `.env.local` exists and has correct values
- Restart dev server after changing environment variables

### Images not uploading
- Check storage bucket is named exactly `proof-images`
- Verify bucket is **public**
- Check storage policies are set correctly

### Admin panel not showing
- Verify you registered with exact email: `ashish.deekonda@phinite.ai`
- Check database `admins` table has your user_id

### AI verification not working
- Verify `AI_VERIFICATION_API_KEY` is correct
- Check AI API endpoint is accessible
- Verify `AI_VERIFICATION_API_URL` is the full START endpoint (includes trigger ID)
- Look at browser console and server logs for error messages
- Check that the URL format is: `https://<host>/trigger/start/<PROJECT_ID>/<TRIGGER_ID>/<environment>`
- The status endpoint is automatically constructed as: `https://<host>/trigger/status/<PROJECT_ID>/<workflow_id>`

### Build fails
- Run `npm install` again
- Delete `.next` folder and rebuild
- Check all TypeScript errors are resolved

## Monthly Reset

The leaderboard automatically resets on the 1st of each month. Historical data is preserved in the `monthly_points` table.

To manually reset (admin only):
```sql
-- Run this in Supabase SQL Editor
SELECT reset_monthly_points();
```

## Database Maintenance

### View all submissions:
```sql
SELECT * FROM submissions ORDER BY submitted_at DESC;
```

### View leaderboard:
```sql
SELECT * FROM current_month_leaderboard;
```

### Check admin users:
```sql
SELECT u.name, u.email 
FROM users u 
JOIN admins a ON u.id = a.user_id;
```

### Add more admin users:
```sql
INSERT INTO admins (user_id)
SELECT id FROM users WHERE email = 'another.admin@company.com';
```

## Security Notes

⚠️ **IMPORTANT**: Never commit `.env.local` to git!

✅ **Good practices**:
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use strong `JWT_SECRET`
- Enable Row Level Security (RLS) in Supabase
- Use HTTPS in production
- Regularly rotate API keys

## Support

For issues or questions, contact: ashish.deekonda@phinite.ai

---

## Quick Reference

**Ports:**
- Development: http://localhost:3000

**Key Files:**
- Database schema: `schema.sql`
- Environment variables: `.env.local`
- API routes: `app/api/`
- Pages: `app/*/page.tsx`

**Important URLs:**
- Supabase Dashboard: https://supabase.com/dashboard
- Production App: (your deployment URL)
