# Supabase Configuration for ResumeForge

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project URL and anon key from the project settings

### 2. Set up the Database Schema

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/schema.sql
# Paste and run in Supabase SQL Editor
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Enable OAuth Providers (Optional)

1. Go to Authentication → Providers in your Supabase dashboard
2. Enable Google OAuth
3. Add your Google Cloud credentials

### 5. Configure Storage

1. Go to Storage in your Supabase dashboard
2. Create a new public bucket named `avatars`
3. Add a policy to allow authenticated users to upload images:
   - SELECT: Allow public access
   - INSERT: Allow authenticated users
   - UPDATE: Allow authenticated users
   - DELETE: Allow authenticated users

## Database Tables

### profiles
Links to Supabase auth.users and stores additional user information.

### resumes
Main table storing:
- `content` (JSONB): Personal info and resume sections
- `theme_config` (JSONB): Theme customization settings
- `is_public`: For public resume sharing

### templates
Pre-built resume templates for quick start.

## Row Level Security (RLS)

The schema includes RLS policies to ensure:
- Users can only view, edit, and delete their own resumes
- Public resumes are viewable by everyone
- Profile data is properly protected

## Next Steps

After setting up the database, run:

```bash
npm run dev
```

Visit http://localhost:3000 to start building resumes!
