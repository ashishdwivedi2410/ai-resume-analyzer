# Contributing to AI Resume Analyzer

Thank you for your interest in contributing! This guide will get you up and running.

---

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Running Tests](#running-tests)
- [Code Style](#code-style)

---

## Code of Conduct

Be respectful, constructive, and inclusive. See `CODE_OF_CONDUCT.md`.

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node 20+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Local Setup

```bash
# 1. Fork and clone
git clone https://github.com/ashishdwivedi2410/ai-resume-analyzer
cd ai-resume-analyzer

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY, DATABASE_URL, SECRET_KEY

# 3. Frontend setup
cd ../frontend
npm install
cp .env.example .env

# 4. Start services
docker compose up db redis -d   # Just DB + Redis
cd ../backend && uvicorn main:app --reload
cd ../frontend && npm run dev
```

---

## Development Workflow

```
1. Create a branch from `develop`
2. Make your changes
3. Write/update tests
4. Run the full test suite
5. Open a PR → `develop`
6. After review → `develop` is merged into `main` on release
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, protected |
| `develop` | Integration branch |
| `feature/xxx` | New features |
| `fix/xxx` | Bug fixes |
| `chore/xxx` | Tooling, deps, docs |
| `hotfix/xxx` | Emergency prod fixes |

---

## Commit Convention

We follow **Conventional Commits**:

```
<type>(scope): <short description>

Types: feat | fix | docs | style | refactor | test | chore | ci

Examples:
feat(scoring): add hybrid embedding + LLM scoring
fix(auth): refresh token not invalidated on logout
docs(readme): add docker setup instructions
test(ranker): add edge case for empty resume list
chore(deps): bump anthropic SDK to 0.30
```

---

## Running Tests

### Backend
```bash
cd backend
pytest tests/ -v
pytest tests/ -v --cov=. --cov-report=html   # With coverage
```

### Frontend
```bash
cd frontend
npm run build     # Production build check
```

### Full stack
```bash
docker compose up --build    # Spins everything up
```

---

## Code Style

### Python
- **Formatter**: `black` (line length 120)
- **Linter**: `flake8`
- **Type hints**: Required on all public functions
- Run: `black . && flake8 .`

### JavaScript / React
- **Formatter**: Prettier (auto via editor)
- Functional components only
- `clsx` for conditional classnames
- No inline styles (use Tailwind utilities)

---

## Areas Open for Contribution

- 🧪 Tests — unit, integration, E2E
- 🌍 Multi-language resume support
- 📊 More chart types in Rankings
- 🔍 Advanced JD keyword extraction
- 📧 Email notification on analysis complete
- 🤖 Support for additional AI providers
- 🐛 Bug fixes listed in Issues

---

## Questions?

Open a [Discussion](https://github.com/your-repo/discussions) or ping in the issue.