"""Integration tests — Auth and Resume API endpoints"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock


# ── Auth Endpoints ────────────────────────────────────────────────────────
class TestAuthEndpoints:
    def test_register_success(self, client):
        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.email = "newuser@test.com"
        mock_user.full_name = "New User"
        mock_user.is_active = True
        from datetime import datetime
        mock_user.created_at = datetime.now()

        with patch("routers.auth.get_db") as mock_db_dep:
            mock_db = MagicMock()
            mock_db.__enter__ = MagicMock(return_value=mock_db)
            mock_db.__exit__ = MagicMock(return_value=False)
            mock_db.query.return_value.filter.return_value.first.return_value = None
            mock_db.add = MagicMock()
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock(side_effect=lambda u: setattr(u, 'id', 1) or setattr(u, 'created_at', datetime.now()))
            mock_db_dep.return_value = iter([mock_db])

            # Test schema validation
            from schemas.auth import UserRegister
            payload = UserRegister(email="newuser@test.com", password="pass123", full_name="New User")
            assert payload.email == "newuser@test.com"

    def test_login_returns_tokens(self):
        from utils.jwt import create_access_token, create_refresh_token, verify_token
        token_data = {"sub": "1", "email": "user@test.com"}
        access = create_access_token(token_data)
        refresh = create_refresh_token(token_data)
        assert verify_token(access)["sub"] == "1"
        assert verify_token(refresh, "refresh")["sub"] == "1"

    def test_register_invalid_email(self, client):
        response = client.post("/auth/register", json={
            "email": "not-an-email",
            "password": "pass123"
        })
        assert response.status_code == 422

    def test_register_missing_password(self, client):
        response = client.post("/auth/register", json={"email": "user@test.com"})
        assert response.status_code == 422

    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "api" in data
        assert data["api"] == "healthy"

    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "app" in data
        assert "docs" in data


# ── Schema Validation ─────────────────────────────────────────────────────
class TestSchemas:
    def test_parsed_resume_defaults(self):
        from schemas.resume import ParsedResumeData
        r = ParsedResumeData()
        assert r.skills == []
        assert r.experience == []
        assert r.education == []
        assert r.name is None

    def test_analyze_request_valid(self):
        from schemas.resume import AnalyzeRequest
        req = AnalyzeRequest(resume_id=1, jd_text="Looking for Python dev")
        assert req.resume_id == 1

    def test_batch_analyze_request(self):
        from schemas.resume import BatchAnalyzeRequest
        req = BatchAnalyzeRequest(resume_ids=[1, 2, 3], jd_text="JD text")
        assert len(req.resume_ids) == 3

    def test_section_scores_model(self):
        from schemas.resume import SectionScores
        s = SectionScores(
            skills_score=85.5,
            experience_score=72.0,
            education_score=68.0,
            total_score=76.5
        )
        assert s.total_score == 76.5
        assert s.scoring_breakdown is None

    def test_experience_item_optional_fields(self):
        from schemas.resume import ExperienceItem
        exp = ExperienceItem()
        assert exp.company is None
        assert exp.role is None

    def test_education_item_optional_fields(self):
        from schemas.resume import EducationItem
        edu = EducationItem(institution="MIT", degree="BSc")
        assert edu.institution == "MIT"
        assert edu.field is None


# ── Feedback ──────────────────────────────────────────────────────────────
class TestFeedback:
    def test_default_feedback_strong_score(self):
        from services.feedback import _default_feedback
        from schemas.resume import SectionScores
        scores = SectionScores(skills_score=80, experience_score=75, education_score=70, total_score=76)
        fb = _default_feedback(scores)
        assert "match_summary" in fb
        assert "strengths" in fb
        assert "improvements" in fb
        assert "strong" in fb["match_summary"].lower()

    def test_default_feedback_moderate_score(self):
        from services.feedback import _default_feedback
        from schemas.resume import SectionScores
        scores = SectionScores(skills_score=55, experience_score=50, education_score=45, total_score=51)
        fb = _default_feedback(scores)
        assert "moderate" in fb["match_summary"].lower()

    def test_default_feedback_weak_score(self):
        from services.feedback import _default_feedback
        from schemas.resume import SectionScores
        scores = SectionScores(skills_score=20, experience_score=25, education_score=30, total_score=24)
        fb = _default_feedback(scores)
        assert "significant" in fb["match_summary"].lower() or "upskilling" in fb["match_summary"].lower()


# ── Parser ────────────────────────────────────────────────────────────────
class TestParser:
    def test_unsupported_file_rejected(self):
        import asyncio
        from fastapi import UploadFile, HTTPException
        from services.parser import parse_resume
        import io

        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "resume.txt"
        mock_file.read = AsyncMock(return_value=b"text content")

        with pytest.raises(HTTPException) as exc:
            asyncio.get_event_loop().run_until_complete(parse_resume(mock_file))
        assert exc.value.status_code == 400

    def test_file_too_large_rejected(self):
        import asyncio
        from fastapi import UploadFile, HTTPException
        from services.parser import parse_resume

        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "resume.pdf"
        mock_file.read = AsyncMock(return_value=b"x" * (11 * 1024 * 1024))  # 11MB

        with pytest.raises(HTTPException) as exc:
            asyncio.get_event_loop().run_until_complete(parse_resume(mock_file))
        assert exc.value.status_code == 413