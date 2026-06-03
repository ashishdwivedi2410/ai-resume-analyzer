# 🤖 AI Resume Analyzer
 
A full-stack AI-powered Resume Analyzer that evaluates resumes against job descriptions using Claude AI, embedding-based similarity scoring, and intelligent feedback generation.
 
---
 
## ✨ Features
 
| Feature | Details |
|--------|---------|
| 📄 Resume Parsing | PDF and DOCX support via PyMuPDF + python-docx |
| 🧠 AI Extraction | Claude extracts Name, Email, Skills, Experience, Education |
| 📊 Section Scoring | Skills (40%), Experience (35%), Education (25%) |
| 🔀 Hybrid Scoring | Embedding cosine similarity + Claude LLM scoring |
| 🏆 Ranking | Multi-resume batch analysis with ranked leaderboard |
| 💡 Feedback | Strengths & actionable improvement suggestions |
| 🔐 Auth | JWT access + refresh tokens |
| ⚡ Caching | Redis cache (keyed by SHA-256 of resume+JD) |
| 🔍 RAG (Bonus) | ChromaDB vector store for retrieval-augmented scoring |
 
---
 
## 🏗️ Tech Stack
 
- **Backend**: FastAPI (Python 3.11)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **Embeddings**: `sentence-transformers` (all-MiniLM-L6-v2)
- **Database**: PostgreSQL + SQLAlchemy
- **Cache**: Redis
- **Vector DB**: ChromaDB (bonus RAG)
- **Auth**: JWT (python-jose + passlib bcrypt)
- **Parsing**: PyMuPDF (PDF), python-docx (DOCX)
---
 
## 🚀 Quick Start
 
### Option 1 — Docker (Recommended)
 
```bash
# 1. Clone
git clone https://github.com/your-username/ai-resume-analyzer.git
cd ai-resume-analyzer
 
# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set ANTHROPIC_API_KEY and SECRET_KEY
 
# 3. Start all services
docker-compose up --build
 
# API runs at: http://localhost:8000
# Docs at:     http://localhost:8000/docs
```
 
### Option 2 — Local Development
 
**Prerequisites**: Python 3.11+, PostgreSQL, Redis
 
```bash
cd backend
 
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
 
# Install dependencies
pip install -r requirements.txt
 
# Configure environment
cp .env.example .env
# Edit .env and set your values
 
# Run the API
uvicorn main:app --reload --port 8000
```
 
---
 
## ⚙️ Environment Variables
 
| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | ✅ Yes |
| `SECRET_KEY` | JWT signing secret (32+ chars) | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `REDIS_URL` | Redis connection string | Optional (caching disabled if missing) |
| `CLAUDE_MODEL` | Claude model name | Defaults to `claude-sonnet-4-20250514` |
| `MAX_FILE_SIZE_MB` | Max resume upload size | Defaults to `10` |
 
---
 
## 📡 API Reference
 
### Authentication
 
```
POST /auth/register     → Register new user
POST /auth/login        → Login → JWT tokens
POST /auth/refresh      → Refresh access token
```
 
### Resume Management
 
```
POST   /resume/upload         → Upload single resume (PDF/DOCX)
POST   /resume/upload/batch   → Upload up to 10 resumes
GET    /resume/               → List user's resumes
GET    /resume/{id}           → Get specific resume
DELETE /resume/{id}           → Delete resume
```
 
### Analysis
 
```
POST /analyze/single          → Analyze 1 resume vs JD
POST /analyze/batch           → Analyze + rank multiple resumes
GET  /analyze/results/{id}    → Get cached result
GET  /analyze/rankings        → All results sorted by score
```
 
---
 
## 🧪 Sample Input / Output
 
### Register
```json
POST /auth/register
{
  "email": "recruiter@company.com",
  "full_name": "Jane Smith",
  "password": "SecurePass123!"
}
```
 
### Analyze Single Resume
```json
POST /analyze/single
Authorization: Bearer <token>
{
  "resume_id": 1,
  "jd_text": "We are looking for a Senior Python Developer with 5+ years FastAPI, PostgreSQL, AWS, Docker experience..."
}
```
 
### Sample Output
```json
{
  "id": 42,
  "resume_id": 1,
  "candidate_name": "John Doe",
  "resume_filename": "john_doe_resume.pdf",
  "skills_score": 85.4,
  "experience_score": 72.1,
  "education_score": 68.0,
  "total_score": 76.8,
  "strengths": [
    "Strong Python expertise (5 years) directly matches the JD requirement",
    "FastAPI and PostgreSQL experience aligns with backend stack",
    "Docker experience covers containerization requirement"
  ],
  "improvements": [
    "Add AWS certification or project experience — JD specifically requires cloud skills",
    "Highlight any CI/CD experience (GitHub Actions, Jenkins) which is mentioned in JD",
    "Include system design examples — the role emphasizes scalable architecture"
  ],
  "match_summary": "John is a strong backend candidate with solid Python fundamentals. While skills and experience align well, adding cloud and DevOps depth would make this application much stronger."
}
```
 
### Batch Analysis + Ranking
```json
POST /analyze/batch
{
  "resume_ids": [1, 2, 3],
  "jd_text": "Senior Python Developer..."
}
 
Response:
{
  "total_resumes": 3,
  "jd_summary": "Senior Python Developer with FastAPI, PostgreSQL, AWS...",
  "rankings": [
    { "rank": 1, "candidate_name": "John Doe", "total_score": 76.8 },
    { "rank": 2, "candidate_name": "Sarah Lee", "total_score": 71.2 },
    { "rank": 3, "candidate_name": "Mike Ray", "total_score": 58.4 }
  ]
}
```
 
---
 
## 🧠 Scoring Algorithm
 
```
Final Section Score = 0.4 × (Embedding Cosine Similarity) 
                    + 0.6 × (Claude LLM Score)
 
Total Score = 0.40 × Skills Score
            + 0.35 × Experience Score
            + 0.25 × Education Score
```
 
---
 
## ⚡ Caching Strategy
 
```
cache_key = SHA-256(resume_text + jd_text)
 
Request → Check Redis
  ├── HIT  → Return cached result instantly (< 10ms)
  └── MISS → Run full AI pipeline (~5-15s) → Store in Redis (TTL: 1hr)
```
 
---
 
## 🔍 RAG (Bonus)
 
When ChromaDB is available:
1. Resumes are chunked (500 words, 50-word overlap) and indexed on upload
2. During analysis, relevant chunks are retrieved by querying with JD text
3. Retrieved context augments the Claude scoring prompts for better accuracy
---
 
## 📁 Project Structure
 
```
backend/
├── main.py              # FastAPI app, middleware, lifespan
├── config.py            # Settings via pydantic-settings
├── routers/
│   ├── auth.py          # /auth endpoints
│   ├── resume.py        # /resume endpoints  
│   └── analyze.py       # /analyze endpoints
├── services/
│   ├── parser.py        # PDF/DOCX text extraction
│   ├── extractor.py     # Claude structured extraction
│   ├── embedder.py      # sentence-transformers embeddings
│   ├── scorer.py        # Hybrid section scoring
│   ├── ranker.py        # Multi-resume ranking
│   ├── feedback.py      # Claude feedback generation
│   └── rag.py           # ChromaDB RAG (bonus)
├── models/              # SQLAlchemy ORM models
├── schemas/             # Pydantic request/response schemas
├── utils/
│   ├── jwt.py           # JWT create/verify
│   ├── cache.py         # Redis helpers
│   └── logger.py        # Loguru setup
└── db/
    └── database.py      # Connection + session
```
 
---
 
## ⚠️ Assumptions & Limitations
 
- Scanned/image-based PDFs are not supported (no OCR)
- Maximum 10 resumes per batch upload
- Claude model must be `claude-sonnet-4-20250514` or newer
- Embedding model (`all-MiniLM-L6-v2`) downloads ~90MB on first run
- Redis is optional; if unavailable, caching is silently disabled
- RAG (ChromaDB) is a bonus feature and optional
---
 
## 📝 License
 
MIT