# Celea - AI-Native Video Automation for Hollywood

![Celea Logo](public/celea-logo.png)

Celea is an AI-powered video generation platform that automates the video refinement process using GPT-4o, Veo 3.1, and Gemini 2.5 Pro.

## Features

- **Intelligent Prompt Enhancement**: GPT-4o transforms rough prompts into cinema-grade Veo 3.1 prompts
- **AI Video Generation**: Veo 3.1 generates high-quality videos with reference image support
- **Quality Analysis**: Gemini 2.5 Pro analyzes videos against user goals
- **Auto-Refinement**: Automatic refinement loop (up to 5 iterations) until quality passes
- **Real-time Progress**: SSE-based real-time updates during generation
- **Project Management**: Organize videos into projects

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **File Storage**: Supabase Storage
- **Background Jobs**: Inngest
- **AI Models**: OpenAI GPT-4o, Google Veo 3.1, Gemini 2.5 Pro
- **State Management**: Zustand
- **Package Manager**: Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Supabase](https://supabase.com/) account
- [OpenAI](https://platform.openai.com/) API key
- [Google AI](https://ai.google.dev/) API key with Veo 3.1 access

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/celea.git
cd celea
\`\`\`

2. Install dependencies:
\`\`\`bash
bun install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Update `.env.local` with your credentials:
\`\`\`env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# AI APIs
OPENAI_API_KEY="sk-..."
GOOGLE_AI_API_KEY="..."

# Inngest (optional for local dev)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
\`\`\`

5. Set up the database:
\`\`\`bash
bunx prisma db push
\`\`\`

6. Create Supabase storage bucket:
   - Go to Supabase Dashboard → Storage
   - Create a bucket named \`celea-media\`
   - Set it as public

7. Run the development server:
\`\`\`bash
bun dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com) and import your repository

3. Add environment variables in Vercel dashboard:
   - \`DATABASE_URL\`
   - \`DIRECT_URL\`
   - \`NEXT_PUBLIC_SUPABASE_URL\`
   - \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - \`SUPABASE_SERVICE_ROLE_KEY\`
   - \`OPENAI_API_KEY\`
   - \`GOOGLE_AI_API_KEY\`
   - \`INNGEST_EVENT_KEY\`
   - \`INNGEST_SIGNING_KEY\`

4. Deploy!

### Inngest Setup

1. Go to [Inngest](https://inngest.com) and create an app

2. Add the Inngest keys to your Vercel environment variables

3. Inngest will automatically sync with your \`/api/inngest\` endpoint

## Project Structure

\`\`\`
celea/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing page
│   │   ├── projects/           # Projects pages
│   │   └── api/                # API routes
│   ├── components/             # UI components
│   ├── lib/
│   │   ├── prompts.ts          # Central AI prompts
│   │   ├── db.ts               # Prisma client
│   │   ├── supabase/           # Supabase clients
│   │   └── ai/                 # AI service integrations
│   ├── inngest/                # Background jobs
│   └── stores/                 # Zustand stores
├── prisma/
│   └── schema.prisma           # Database schema
└── public/
    └── celea-logo.png
\`\`\`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/projects\` | List all projects |
| POST | \`/api/projects\` | Create new project |
| GET | \`/api/projects/[id]\` | Get project details |
| DELETE | \`/api/projects/[id]\` | Delete project |
| POST | \`/api/upload\` | Upload reference images |
| POST | \`/api/pipeline\` | Start video generation |
| GET | \`/api/job-status/[id]\` | Get job status (SSE) |
| GET | \`/api/video/[id]\` | Stream/download video |
| POST | \`/api/enhance-prompt\` | Enhance prompt (direct) |
| POST | \`/api/generate-video\` | Generate video (direct) |
| POST | \`/api/analyze-video\` | Analyze video (direct) |

## Color Scheme

- **Primary (Coral)**: RGB(238, 133, 125)
- **Secondary (Lavender)**: RGB(193, 202, 241)
- **Accent 1 (Cream)**: RGB(248, 214, 134)
- **Accent 2 (Cyan)**: RGB(124, 199, 212)
- **Text**: #2d3748

## License

MIT

---

Built with ❤️ by Celea
