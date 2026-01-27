# Troubleshooting Admin Submissions Not Showing

## Issue
Admin's submissions (e.g., ashish.deekonda@phinite.ai) are not appearing in the admin review queue.

## Debug Steps

### 1. Use the Debug Button

1. Go to the Admin Panel
2. Click **🔍 Debug Info** button in the top-right
3. This will show you:
   - Total submissions in database
   - Submissions grouped by status
   - Recent 10 submissions with details

### 2. Check What You'll See

The debug info will help identify the issue:

#### Scenario A: Admin's submissions are in 'pending' status
```json
{
  "byStatus": {
    "pending": [
      { "user": "ashish.deekonda@phinite.ai", "action": "LIKE", ... }
    ],
    "manual_review": [
      { "user": "other.user@example.com", "action": "COMMENT", ... }
    ]
  }
}
```

**Problem**: Admin's submissions are stuck in 'pending' and never reached 'manual_review'

**Solution**: 
- The AI analysis hasn't completed yet (wait 3-5 minutes)
- OR the status polling route isn't being called (check server logs)
- OR there's an error in the AI workflow

#### Scenario B: Admin's submissions show 'manual_review' but not in UI
```json
{
  "byStatus": {
    "manual_review": [
      { "user": "ashish.deekonda@phinite.ai", "action": "ORIGINAL_POST", ... },
      { "user": "other.user@example.com", "action": "COMMENT", ... }
    ]
  }
}
```

**Problem**: Submissions are in database but not displaying in UI

**Solution**: 
- Check browser console for errors
- Refresh the admin page
- Check if there's a database RLS policy blocking the query

#### Scenario C: No workflow_id
```json
{
  "recentSubmissions": [
    {
      "user": "ashish.deekonda@phinite.ai",
      "status": "pending",
      "workflow_id": null
    }
  ]
}
```

**Problem**: AI workflow never started

**Solution**:
- Check `AI_VERIFICATION_API_URL` and `AI_VERIFICATION_API_KEY` in `.env.local`
- Check server logs for API errors
- Verify the AI API is accessible

### 3. Check Server Logs

When fetching pending submissions, you'll now see logs like:
```
Admin pending: Found 5 submissions
Submission user emails: user1@example.com, ashish.deekonda@phinite.ai, user2@example.com
```

If you see `Found 0 submissions`, but the debug shows submissions exist with `manual_review` status, there might be a database query issue.

### 4. Manual Database Check

If you have access to Supabase dashboard:

1. Go to Table Editor → submissions
2. Filter by:
   - `status = 'manual_review'`
3. Look for admin's email in user_id column (you'll need to join with users table)
4. Check if submissions exist

SQL Query:
```sql
SELECT 
  s.id,
  s.status,
  s.action_type,
  s.workflow_id,
  s.submitted_at,
  u.email,
  u.name
FROM submissions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'manual_review'
ORDER BY s.submitted_at DESC;
```

## Common Issues and Solutions

### Issue 1: Submissions Stuck in 'pending'

**Cause**: AI analysis not completing or status route not being called

**Fix**:
1. Check if background processing is enabled
2. Verify the workflow_id was created
3. Manually call status endpoint:
   ```bash
   curl -X GET 'http://localhost:3000/api/submit/status?submission_id=YOUR_SUBMISSION_ID' \
     -H 'Authorization: Bearer YOUR_TOKEN'
   ```

### Issue 2: Row Level Security (RLS) Policy

**Cause**: Supabase RLS policy might be blocking admin's own submissions

**Fix**:
1. Go to Supabase → Authentication → Policies
2. Check submissions table policies
3. Ensure policies allow reading all submissions for admins
4. Example policy:
   ```sql
   -- Allow admins to see all submissions
   CREATE POLICY "Admins can view all submissions"
   ON submissions
   FOR SELECT
   TO authenticated
   USING (
     EXISTS (
       SELECT 1 FROM admins
       WHERE admins.user_id = auth.uid()
     )
   );
   ```

### Issue 3: Admin Table Not Set Up

**Cause**: Admin user not in the admins table

**Fix**:
1. Check if admin exists:
   ```sql
   SELECT * FROM admins 
   JOIN users ON admins.user_id = users.id
   WHERE users.email = 'ashish.deekonda@phinite.ai';
   ```
2. If not found, add admin:
   ```sql
   INSERT INTO admins (user_id)
   SELECT id FROM users WHERE email = 'ashish.deekonda@phinite.ai';
   ```

### Issue 4: Submissions Created Before Code Change

**Cause**: Old submissions created before the manual_review workflow was implemented

**Fix**: 
- These submissions might have auto-approved to 'verified' status
- Only NEW submissions will go to 'manual_review'
- Check debug info to see status distribution

## Testing the Fix

### Create a Test Submission

1. As admin, go to Dashboard
2. Submit a test screenshot
3. Wait 3-5 minutes for AI analysis
4. Check Debug Info to see status
5. Should appear in Admin Panel with blue border/badge

### Expected Flow

```
1. Submit screenshot
   → Status: 'pending'
   → workflow_id: created

2. Wait ~3 minutes
   → AI analyzes image
   → Status polling happens (background)

3. AI completes
   → Status: 'manual_review'
   → Should appear in Admin Panel

4. Admin reviews
   → Approve or Reject
   → Status: 'verified' or 'rejected'
```

## API Endpoints for Debugging

### Check All Submissions (Admin Only)
```bash
curl -X GET 'http://localhost:3000/api/admin/all-submissions' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

### Check Pending Submissions
```bash
curl -X GET 'http://localhost:3000/api/admin/pending' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

### Check Specific Submission Status
```bash
curl -X GET 'http://localhost:3000/api/submit/status?submission_id=SUBMISSION_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Quick Fixes Checklist

- [ ] Waited at least 3-5 minutes after submission
- [ ] Clicked Debug Info button to see all submissions
- [ ] Checked server logs for errors
- [ ] Verified admin user in admins table
- [ ] Checked workflow_id exists on submission
- [ ] Refreshed admin page
- [ ] Checked browser console for errors
- [ ] Verified `.env.local` has correct AI API credentials
- [ ] Checked Supabase RLS policies
- [ ] Verified submission status is 'manual_review' in database

## Still Not Working?

If submissions still don't show:

1. **Take a screenshot of the Debug Info**
2. **Check browser console and copy any errors**
3. **Check server terminal logs**
4. **Run the database query above and share results**
5. **Contact**: ashish.deekonda@phinite.ai with:
   - Debug info screenshot
   - Console errors
   - Server logs
   - Database query results

## Related Files

- `/app/api/admin/pending/route.ts` - Fetches pending submissions
- `/app/api/admin/all-submissions/route.ts` - Debug endpoint (NEW)
- `/app/api/submit/status/route.ts` - Handles AI status updates
- `/app/admin/page.tsx` - Admin UI with debug button
