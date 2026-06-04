<div align="center">
# 🤖 AI Resume Analyzer
 
**Full-stack AI-powered resume evaluation system**  
*Built with FastAPI · React · Claude AI · PostgreSQL · Redis*
 
[![CI Pipeline](https://github.com/YOUR_USERNAME/ai-resume-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/ai-resume-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Node 20+](https://img.shields.io/badge/Node-20+-green.svg)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
 
</div>
---
 
## 📸 Overview
 
AI Resume Analyzer evaluates resumes against job descriptions using a hybrid of **embedding-based similarity scoring** and **Claude LLM analysis**, generating ranked candidates with detailed section-wise scores and actionable feedback.
 
---
 
## ✨ Features
 
| Feature | Details |
|--------|---------|
| 📄 Resume Parsing | PDF and DOCX via PyMuPDF + python-docx |
| 🧠 AI Extraction | Claude extracts Name, Email, Skills, Experience, Education |
| 📊 Section Scoring | Skills (40%) · Experience (35%) · Education (25%) |
| 🔀 Hybrid Scoring | Embedding cosine similarity + Claude LLM (weighted) |
| 🏆 Ranking | Batch analysis with ranked leaderboard + podium |
| 💡 Feedback | Per-candidate strengths & actionable improvements |
| ⚡ Caching | Redis cache keyed by SHA-256(resume + JD) |
| 🔐 Auth | JWT access + refresh tokens with bcrypt |
| 🔍 RAG (Bonus) | ChromaDB vector store for retrieval-augmented scoring |
| 📜 History | Searchable, filterable all-time analysis log |
 
---
 
## 🏗️ Architecture
 
```
┌─────────────────────────────────────────────┐
│           React Frontend (Port 3000)        │
│  Auth · Dashboard · Rankings · History      │
└──────────────────┬──────────────────────────┘
                   │ REST API (JWT)
┌──────────────────▼──────────────────────────┐
│          FastAPI Backend (Port 8000)        │
│  /auth  /resume  /analyze                  │
└──────┬──────────┬───────────┬───────────────┘
       │          │           │
  ┌────▼───┐ ┌───▼────┐ ┌────▼──────────────┐
  │Postgres│ │ Redis  │ │  Claude API        │
  │(Users  │ │(Cache) │ │  + Embeddings      │
  │Results)│ │        │ │  + ChromaDB (RAG)  │
  └────────┘ └────────┘ └───────────────────┘
```
 
---
 
## 🚀 Quick Start
 
### Option 1 — Docker (Recommended)
 
```bash
git clone https://github.com/ashishdwivedi2410/ai-resume-analyzer

cd ai-resume-analyzer
 
# Configure environment
cp backend/.env.example backend/.env
# ✏️  Edit backend/.env  — set ANTHROPIC_API_KEY and SECRET_KEY
 
# Start all 4 services
docker compose up --build
 
# ✅ API     → http://localhost:8000
# ✅ Docs    → http://localhost:8000/docs
# ✅ Frontend→ http://localhost:3000
```
 
### Option 2 — Local Development
 
**Prerequisites:** Python 3.11+, Node 20+, PostgreSQL 15+, Redis 7+
 
```bash
# ── Backend ───────────────────────────────────
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Edit: set ANTHROPIC_API_KEY, DATABASE_URL, SECRET_KEY
uvicorn main:app --reload   # → http://localhost:8000
 
# ── Frontend (new terminal) ───────────────────
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev                 # → http://localhost:3000
```
 
---
 
## ⚙️ Environment Variables
 
**`backend/.env`**
 
| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `SECRET_KEY` | ✅ | JWT signing secret (32+ chars) |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Optional | `redis://localhost:6379/0` (caching disabled if absent) |
| `CLAUDE_MODEL` | Optional | Default: `claude-sonnet-4-20250514` |
| `MAX_FILE_SIZE_MB` | Optional | Default: `10` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | Default: `60` |
 
---
 
## 📡 API Reference
 
Interactive docs available at **`/docs`** (Swagger UI) and **`/redoc`**.
 
### Authentication
```
POST  /auth/register    Register new account
POST  /auth/login       Login → JWT tokens
POST  /auth/refresh     Refresh access token
GET   /auth/me          Get current user
```
 
### Resumes
```
POST   /resume/upload         Upload single resume (PDF/DOCX)
POST   /resume/upload/batch   Upload up to 10 resumes
GET    /resume/               List all user resumes
GET    /resume/{id}           Get specific resume
DELETE /resume/{id}           Delete resume
```
 
### Analysis
```
POST  /analyze/single         Analyze 1 resume vs job description
POST  /analyze/batch          Analyze + rank multiple resumes
GET   /analyze/results/{id}   Get cached result
GET   /analyze/rankings       All results sorted by score
DELETE /analyze/results/{id}  Delete a result
```
 
### Health
```
GET  /          App info
GET  /health    Service health (API, DB, Redis, model)
```
 
---
 
## 🧠 Scoring Algorithm
 
```
Per Section (Skills / Experience / Education):
  score = 0.4 × embedding_cosine_similarity(section, JD)
        + 0.6 × claude_llm_score(section, JD)
 
Total Score:
  total = 0.40 × skills_score
        + 0.35 × experience_score
        + 0.25 × education_score
```
 
**Score labels:**
- 🟢 **Strong Match** — ≥ 70
- 🟡 **Moderate Match** — 45–69
- 🔴 **Weak Match** — < 45
---
 
## 📊 Sample Output
 
```json
{
  "candidate_name": "John Doe",
  "resume_filename": "john_doe.pdf",
  "skills_score": 85.4,
  "experience_score": 72.1,
  "education_score": 68.0,
  "total_score": 76.8,
  "strengths": [
    "5 years of Python directly matches the 4+ year requirement",
    "FastAPI and PostgreSQL align perfectly with the backend stack",
    "Docker experience covers the containerization requirement"
  ],
  "improvements": [
    "Add AWS certification — JD specifically requires cloud experience",
    "Highlight CI/CD work (GitHub Actions, Jenkins) mentioned in JD",
    "Include system design examples for the scalability requirement"
  ],
  "match_summary": "John is a strong backend candidate with solid Python fundamentals..."
}
```
 
---
 
## 📁 Project Structure
 
```
ai-resume-analyzer/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # Test + build on every PR
│   │   ├── cd.yml          # Docker push + release on main
│   │   └── security.yml    # Dependency audit + secret scan
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE/
│
├── backend/                 # FastAPI Python app
│   ├── main.py
│   ├── config.py
│   ├── routers/             # auth · resume · analyze
│   ├── services/            # parser · extractor · embedder · scorer · ranker · feedback · rag
│   ├── models/              # SQLAlchemy ORM
│   ├── schemas/             # Pydantic request/response
│   ├── utils/               # jwt · cache · logger
│   ├── db/                  # database connection
│   ├── tests/               # pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                # React + Vite + Tailwind app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/           # AuthPage · Dashboard · Rankings · History
│   │   ├── components/      # UI · Navbar · DropZone · ResultCard · Charts · Toast
│   │   ├── context/         # AuthContext
│   │   └── services/        # api.js (Axios)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml       # api · db · redis · frontend
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```
 
---
 
## 🧪 Running Tests
 
```bash
cd backend
 
# Run all tests
pytest
 
# With coverage report
pytest --cov=. --cov-report=html
open htmlcov/index.html
```
 
---
 
## ⚡ Performance Notes
 
- **Caching:** Identical (resume + JD) pairs are cached in Redis — subsequent calls return in < 10ms
- **Batch processing:** Up to 10 resumes analyzed sequentially with shared JD embedding
- **Embedding model:** `all-MiniLM-L6-v2` loaded once at startup, ~90MB download on first run
- **RAG indexing:** Chunked at upload time, does not slow down analysis
---
 
## ⚠️ Assumptions & Limitations
 
- Scanned / image-only PDFs are not supported (no OCR)
- Maximum 10 resumes per batch upload
- Anthropic API key required — Claude handles extraction, scoring, feedback
- Redis is optional; caching is silently disabled if unavailable
- ChromaDB RAG is a bonus feature and optional
- Embedding model downloads ~90MB on first startup
---
 
## 🤝 Contributing
 
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch strategy, commit conventions, and test guidelines.
 
---
 
## 📄 License
 
[MIT](LICENSE) — free to use, modify, and distribute.
 
---
 
<div align="center">
Built with ❤️ using <strong>FastAPI</strong>, <strong>React</strong>, and <strong>Claude AI</strong>
</div>
 