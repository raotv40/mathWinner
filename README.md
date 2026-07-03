# MathWinner AI - CBSE K-12 Mathematics Learning Platform

MathWinner AI is a production-ready, progressive K-12 Mathematics Learning Platform designed for CBSE Class 1-12 curriculum. It integrates textbook PDF parsing, teacher lecture videos, interactive whiteboards, competency-based SAFAL assessments, and a RAG-powered AI Tutor into a single offline-first application.

---

## Key Highlights

- **Offline-First PWA**: Download entire chapters (textbook PDF, lecture video, transcripts, formula lists, practice items, and vector embeddings) into local **IndexedDB** storage. Toggle offline mode to experience seamless playback, vector search, whiteboard evaluations, and practice without internet access.
- **Interactive Video Sync**: A custom player that parses teacher videos and aligns transcripts and formulas directly on screen segments, supporting timestamp jumps.
- **Whiteboard Math Grader**: An HTML5 drawing canvas with equation panel helpers and vision API adapters. Students draw equations or upload photos of their notebook page, and the AI evaluates calculations, marks scores, and outputs step feedback.
- **CBSE SAFAL Assessment Engine**: Generates word problems, assertion-reasons, MCQs, and Higher Order Thinking Skills (HOTS) questions, backed by Hint systems and a step-by-step solver.
- **Multilingual Support**: Supports English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Gujarati, Punjabi, and Bengali.
- **Dashboards**: Configured analytics (radar charts, streaks flame, study calendars, average times) specialized for Students, Parents, and Teachers.

---

## Codebase Architecture

```
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration and Security (JWT, bcrypt)
│   │   ├── db/             # SQLAlchemy schemas and database sessions
│   │   ├── routers/        # API endpoints (Auth, Chapters, Practice, Tutor, Whiteboard, Analytics)
│   │   ├── services/       # AI Agents (PDF, Video, Tutor, Question, Whiteboard)
│   │   └── main.py         # FastAPI main runner
│   ├── tests/              # Pytest integrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js 16 (App Router) pages & layouts
│   │   ├── components/     # VideoPlayer, Whiteboard, PracticeEngine, Tutor, Dashboards
│   │   └── lib/            # Dexie.js (IndexedDB local schemas) & API connectors
│   ├── public/             # Service Worker (sw.js) & PWA Manifest
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Local multi-container deploy config
└── .github/workflows/      # GitHub Actions CI/CD deployment
```

---

## Local Setup & Deployment

Ensure you have **Docker** and **Docker Compose** installed.

### 1. Configure Credentials
Create a `.env` file in the root directory (or update compose values):
```env
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mathwinner
REDIS_URL=redis://localhost:6379/0
```
*Note: If `OPENAI_API_KEY` is omitted, the backend automatically falls back to an intelligent simulation mode that generates realistic mock data, ensuring the app runs instantly for demo purposes.*

### 2. Run with Docker Compose
Spin up Postgres, pgvector, Redis, FastAPI, and Next.js in one command:
```bash
docker-compose up --build
```
- Access **Frontend**: [http://localhost:3000](http://localhost:3000)
- Access **FastAPI API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Manual Startup (Development)
If you prefer running without Docker:

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

---

## Verification & Testing

### Automated tests
Run the backend pytest suite:
```bash
cd backend
pytest -v
```

Run the frontend lint checks:
```bash
cd frontend
npm run lint
```
