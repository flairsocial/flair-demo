# Quick Setup Guide: Clerk + Supabase Integration

This guide will get you up and running with the new Clerk authentication and Supabase database integration in under 10 minutes.

## Prerequisites

- Next.js flair-demo app already running
- Clerk account and project
- Supabase account and project

## Step 1: Environment Configuration

Create or update your `.env.local` file:

```env
# Clerk Authentication (you should already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase Database (ADD THESE NEW)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select existing project
3. Go to **Settings** → **API**
4. Copy the **Project URL** (this is your `SUPABASE_URL`)
5. Copy the **service_role secret** (this is your `SUPABASE_SERVICE_ROLE_KEY`)

⚠️ **Important**: Use the **service_role** key, NOT the anon key!

## Step 2: Database Setup

Run the database schema creation in Supabase:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase-schema.sql`
5. Click **Run** to create all tables and indexes

## Step 3: Install Dependencies

The Supabase dependency has already been added to package.json. Due to React 19 compatibility, use the legacy peer deps flag:

```bash
npm install --legacy-peer-deps
```

## Step 4: Test the Setup

Test your database connection and functions:

```bash
npm run test:db
```

This will verify all database functions work correctly.

## Step 5: Migration (Optional)

If you have existing JSON data files, migrate them:

```bash
# Preview what would be migrated (safe)
npm run migrate:dry

# Run actual migration
npm run migrate
```

## Step 6: Start the Application

```bash
npm run dev
```

## Verification Checklist

Visit your app and verify:

- [ ] **Sign In/Sign Up**: Authentication works with Clerk
- [ ] **Profile Settings**: Can save and load profile data
- [ ] **Save Items**: Can save products and see them persist
- [ ] **Collections**: Can create and manage collections
- [ ] **Chat History**: Chat conversations are saved
- [ ] **Cross-Device**: Data syncs across different browsers/devices when signed in

## What Changed?

### For Users
- **No UX changes**: The app looks and works exactly the same
- **Better reliability**: Data is now stored in a proper database
- **Cross-device sync**: Sign in from any device to access your data
- **Better performance**: Database operations are faster than file I/O

### For Developers
- **Authentication required**: All API routes now require Clerk authentication
- **Database service**: New `lib/database-service.ts` replaces `lib/profile-storage.ts`
- **Updated API routes**: All routes now use database service and require auth
- **Migration tools**: Scripts to migrate existing data and test functionality

## Troubleshooting

### "Authentication required" errors
- Ensure user is signed in through Clerk
- Check that Clerk environment variables are correct

### Database connection errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Make sure you're using the service_role key, not the anon key
- Check that database schema was created successfully

### Migration issues
- Ensure data files exist in the `data/` directory
- Check file permissions for creating backups
- Run with `--dry-run` first to preview changes

## Next Steps

1. **Test thoroughly**: Try all features to ensure everything works
2. **Backup data**: The migration script creates backups, but make additional backups if needed
3. **Monitor usage**: Check Supabase dashboard for database usage and performance
4. **Production deployment**: Follow the production checklist in the full documentation

## Need Help?

- Check the full documentation: `CLERK_SUPABASE_IMPLEMENTATION.md`
- Run the test suite: `npm run test:db`
- Review the database service: `lib/database-service.ts`
- Check API route implementations in `app/api/`

## Security Notes

- ✅ All data is now user-scoped (no more anonymous access)
- ✅ API routes require authentication
- ✅ Service role key is only used server-side
- ✅ Proper error handling for auth failures

You're all set! The app now has proper user authentication and persistent database storage. 🎉
