# Celea Deployment Guide

This guide explains how to deploy Celea for free using Vercel, Supabase, and Inngest.

## 📊 Free Tier Limits

### Vercel (Hobby Plan - FREE)
| Resource | Limit |
|----------|-------|
| Serverless Function Timeout | **10 seconds** |
| Bandwidth | 100 GB/month |
| Build Minutes | 6,000/month |
| Deployments | Unlimited |
| Team Members | 1 |

### Supabase (Free Tier)
| Resource | Limit |
|----------|-------|
| Database | 500 MB |
| File Storage | 1 GB |
| Bandwidth | 2 GB/month |
| API Requests | Unlimited |
| Active Users | 50,000/month |

### Inngest (Free Tier)
| Resource | Limit |
|----------|-------|
| Function Runs | 25,000/month |
| Execution Time | Up to 2 hours per run |
| Events | Unlimited |

### Google AI (Gemini + Veo)
- Gemini 2.5 Pro: Pay-per-use (~$1.25/1M input tokens)
- Veo 3.1: Pay-per-use (~$0.35/second of video)

---

## ⚠️ Why Inngest is Required

**The video generation pipeline takes 5-10 minutes per video.**

Vercel's serverless functions have a 10-second timeout on the free tier. This means:
- ❌ The pipeline CANNOT run directly in Vercel functions
- ✅ Inngest runs background jobs that can last up to 2 hours

Inngest handles the long-running video generation while Vercel serves the frontend.

---

## 🚀 Step-by-Step Deployment

### Step 1: Create GitHub Repository

```bash
# If not already done
cd /Users/aryanmangla/Desktop/Celea
git remote add origin https://github.com/YOUR_USERNAME/celea.git
git push -u origin main
```

### Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **"New Project"**
3. Name it `celea` and choose a region close to you
4. Wait for the project to be created (~2 minutes)

**Get Database Credentials:**
1. Go to **Settings → Database**
2. Copy the **Connection string (URI)** - this is `DATABASE_URL`
3. Also copy the **Direct connection** string - this is `DIRECT_URL`

**Get API Keys:**
1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

**Create Storage Bucket:**
1. Go to **Storage**
2. Click **"New bucket"**
3. Name it `celea-media`
4. Check **"Public bucket"**
5. Click Create

### Step 3: Set Up Inngest

1. Go to [inngest.com](https://inngest.com) and create an account
2. Click **"Create App"**
3. Name it `celea`

**Get Inngest Keys:**
1. Go to your app's **Settings**
2. Copy:
   - **Event Key** → `INNGEST_EVENT_KEY`
   - **Signing Key** → `INNGEST_SIGNING_KEY`

### Step 4: Get Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API key"**
3. Copy the key → `GOOGLE_AI_API_KEY`

### Step 5: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New → Project"**
3. Import your `celea` repository
4. **Add Environment Variables:**

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

GOOGLE_AI_API_KEY=AIza...

INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

5. Click **"Deploy"**

### Step 6: Initialize Database

After deployment:

```bash
# Run Prisma migrations
bunx prisma db push
```

Or do it locally before deployment:
```bash
DATABASE_URL="your-supabase-url" bunx prisma db push
```

### Step 7: Connect Inngest to Vercel

1. Go to [inngest.com](https://inngest.com) → Your App
2. Click **"Connect App"**
3. Enter your Vercel deployment URL:
   ```
   https://your-app.vercel.app/api/inngest
   ```
4. Inngest will automatically sync your functions

---

## 🔧 Environment Variables Summary

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string |
| `DIRECT_URL` | Supabase → Settings → Database → Direct connection |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `GOOGLE_AI_API_KEY` | Google AI Studio → API Keys |
| `INNGEST_EVENT_KEY` | Inngest → App Settings |
| `INNGEST_SIGNING_KEY` | Inngest → App Settings |

---

## 📈 Estimated Costs

With free tiers, you can generate approximately:
- **~3-5 videos per day** before hitting API costs
- **25,000 function runs/month** (Inngest free tier)
- **1 GB storage** for generated videos (Supabase)

**Beyond free tier:**
- Veo 3.1: ~$2.80 per 8-second video
- Gemini 2.5 Pro: ~$0.10-0.50 per video (depends on iterations)

---

## 🛠 Troubleshooting

### "Function timed out" error
- Make sure Inngest is properly connected
- Check Inngest dashboard for function logs

### "Database connection failed"
- Verify DATABASE_URL is correct
- Make sure to URL-encode special characters in password

### "Storage upload failed"
- Check that `celea-media` bucket exists and is public
- Verify SUPABASE_SERVICE_ROLE_KEY is correct

### Videos not generating
- Check Google AI API key is valid
- Check Veo 3.1 API access (may need to enable in Google Cloud Console)

---

## 🔄 Development vs Production

| Feature | Development (`bun dev`) | Production (Vercel) |
|---------|------------------------|---------------------|
| Pipeline execution | Direct (in-process) | Inngest (background job) |
| Function timeout | Unlimited | 10 seconds (API), 2 hours (Inngest) |
| Hot reload | Yes | No |

The codebase automatically detects the environment and uses the appropriate method.

---

## 📝 Post-Deployment Checklist

- [ ] Verify Vercel deployment is live
- [ ] Check Supabase database is connected
- [ ] Verify Inngest is receiving events
- [ ] Test video generation end-to-end
- [ ] Check storage bucket is working
- [ ] Monitor Inngest dashboard for function runs

