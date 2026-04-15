# ResumeForge

A full-stack, professional resume builder with a drag-and-drop editor, live preview, real-time customization, and pixel-perfect PDF export.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)

## ✨ Features

- **🖱️ Drag & Drop Editor** — Reorder resume sections and items with full pointer, touch, and keyboard support powered by `@dnd-kit`
- **📝 Live Preview** — Real-time A4 preview with inline rich-text editing via Tiptap and a floating bubble formatting menu
- **🎨 Custom Design System** — Full control over typography (6 font families), colors (primary/text/muted), spacing, layout (single/double column), and photo styling (shape, size, border, grayscale)
- **📄 PDF Export** — Pixel-perfect PDF generation using Puppeteer (headless Chrome)
- **📋 4 Pre-built Templates** — ATS Professional, Modern Two-Column, Executive Dark, and Creative Minimal
- **🔐 Authentication** — Email/password and Google OAuth via Supabase Auth
- **💾 Cloud Persistence** — Auto-save to Supabase (PostgreSQL with JSONB columns)
- **↩️ Undo/Redo** — Full history stack (up to 50 states) with Immer
- **🌙 Dark Mode** — System-aware theme switching with next-themes
- **📱 Responsive** — Mobile-friendly with adaptive touch targets and collapsible panels
- **🔒 Row Level Security** — Users can only access their own resumes

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Server Actions) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS v3 + shadcn/ui (Radix UI primitives) |
| **State Management** | Zustand + Immer middleware |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable |
| **Rich Text Editor** | Tiptap (StarterKit + extensions) |
| **Database** | Supabase (PostgreSQL, JSONB) |
| **Authentication** | Supabase Auth (Email/Password + Google OAuth) |
| **PDF Generation** | Puppeteer |
| **Animations** | Framer Motion + tailwindcss-animate |
| **Notifications** | Sonner (toast) |
| **Theming** | next-themes (light/dark/system) |

## 📦 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** project ([supabase.com](https://supabase.com))

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/<your-username>/resume-forge.git
cd resume-forge
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase dashboard: **Settings → API**.

4. **Set up the database:**

Run the SQL migrations in your Supabase SQL Editor:

- `supabase/schema.sql` — Creates `profiles`, `resumes`, and `templates` tables with RLS policies
- `supabase/profiles_trigger.sql` — Auto-creates a profile row on user signup
- `supabase/storage.sql` — Creates the `avatars` storage bucket for image uploads

5. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
resume-forge/
├── app/                          # Next.js App Router
│   ├── (routes)/
│   │   ├── page.tsx              # Landing page
│   │   ├── login/page.tsx        # Login page
│   │   ├── register/page.tsx     # Registration page
│   │   ├── dashboard/page.tsx    # User dashboard (resume list)
│   │   └── editor/[id]/page.tsx  # Resume editor
│   ├── api/pdf/route.ts          # PDF generation API
│   ├── auth/callback/route.ts    # OAuth callback handler
│   ├── auth/signout/route.ts     # Sign out handler
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── editor/                   # Editor-specific components
│   │   ├── EditorPanel.tsx       # Sidebar editor (Templates, Content, Design)
│   │   ├── ResumePreview.tsx     # Live A4 preview
│   │   ├── PreviewEditor.tsx     # Inline Tiptap editor
│   │   ├── RichTextEditor.tsx    # Full rich text editor
│   │   └── ImageUpload.tsx       # Avatar upload to Supabase Storage
│   └── dnd/                      # Drag & drop components
│       ├── ResumeDndContext.tsx  # DndContext setup
│       ├── SortableSection.tsx   # Sortable section wrapper
│       └── SortableItem.tsx      # Sortable item wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client
│   ├── templates.ts              # Pre-built resume templates
│   └── utils.ts                  # Utility functions
├── store/
│   └── useResumeStore.ts         # Zustand state management
├── supabase/
│   ├── schema.sql                # Database schema
│   ├── profiles_trigger.sql      # Auto-create profile trigger
│   └── storage.sql               # Storage bucket setup
├── types/
│   └── resume.ts                 # TypeScript type definitions
├── middleware.ts                  # Auth middleware
└── tailwind.config.ts            # Tailwind configuration
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Supabase TypeScript types |
| `npm run db:migrate` | Push database migrations |

## 🎨 Templates

ResumeForge ships with 4 pre-built templates:

| Template | Layout | Font | Style |
|----------|--------|------|-------|
| **ATS Professional** | Single column | Arial | Clean, ATS-friendly |
| **Modern Two-Column** | Double column | Inter | Blue accent, circular photo |
| **Executive Dark** | Single column | Georgia | Dark slate, centered header |
| **Creative Minimal** | Single column | Verdana | Pink accent, rounded grayscale photo |

## 🔐 Authentication

ResumeForge supports two authentication methods:

1. **Email/Password** — Standard email and password sign-up/login
2. **Google OAuth** — One-click sign-in via Google

Both methods are handled through Supabase Auth with cookie-based sessions managed by `@supabase/ssr`.

## 🗄️ Database Schema

### Tables

- **`profiles`** — User profiles linked to `auth.users`
- **`resumes`** — Resume data stored as JSONB (`content` + `theme_config`)
- **`templates`** — Pre-built templates viewable by all users

### Row Level Security (RLS)

- Users can only **create, read, update, and delete** their own resumes
- Public resumes are viewable by everyone
- Templates are viewable by everyone

## 📄 PDF Generation

PDFs are generated server-side via the `/api/pdf` endpoint:

1. User clicks **Download PDF** in the editor
2. Request is sent to `/api/pdf` with the resume ID
3. Server authenticates the user and verifies resume ownership
4. Full HTML is generated using `generateResumeHtml()`
5. Puppeteer renders the HTML and returns a PDF response

> **Note:** Puppeteer requires `chromium` to be installed. In production, ensure the server has the necessary dependencies.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — The React framework
- [Supabase](https://supabase.com/) — Open-source Firebase alternative
- [shadcn/ui](https://ui.shadcn.com/) — Beautiful UI components
- [Tiptap](https://tiptap.dev/) — Headless rich text editor
- [dnd-kit](https://dndkit.com/) — Lightweight drag-and-drop library
