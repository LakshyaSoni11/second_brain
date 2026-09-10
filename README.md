# second_brain

Your personal knowledge hub — save tweets, videos, docs, links and notes; tag, search and share them; ask AI agents to summarize, organize, and **chat with your brain** (RAG).

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + Zustand (PWA)
- **Backend:** Node.js + Express + TypeScript + MongoDB (Mongoose) + Zod + JWT

## Features

- Save content by type: tweet, video, doc, link, tag, **note (Markdown)**
- Auto-fetch OpenGraph metadata and embed YouTube / X previews
- Full-text search, favorites, tags with rename/merge/delete, bulk actions
- Export / import content (JSON, CSV, Markdown)
- Email verification + forgot/reset password, Google & GitHub OAuth
- Custom share links with password and expiry
- AI agents: chat, summarize, auto-tag, weekly digest
- **Ask your brain** — RAG chat with your saved content, answers with cited sources

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env      # add real MONGO_URI + JWT_SECRET
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

## Tests

```bash
cd backend
npm test                 # 55 Vitest + supertest tests
```

## Documentation

```bash
DOCUMENTATION.md         # full implementation docs: architecture, phases, logic + file locations
```

## Project Structure

```
second_brain/
├── backend/     # Express API (auth, content, tags, share, agents, export/import)
└── frontend/    # React SPA (pages, components, stores, PWA)
```