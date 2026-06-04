"""Unit tests — utils and core services (no DB, no external APIs)"""
import pytest
from datetime import datetime
from unittest.mock import patch


# ── JWT ───────────────────────────────────────────────────────────────────
class TestJWT:
    def test_create_and_verify_access_token(self):
        from utils.jwt import create_access_token, verify_token
        token = create_access_token({"sub": "99", "email": "x@x.com"})
        payload = verify_token(token, token_type="access")
        assert payload["sub"] == "99"
        assert payload["type"] == "access"

    def test_refresh_token_type(self):
        from utils.jwt import create_refresh_token, verify_token
        token = create_refresh_token({"sub": "1"})
        payload = verify_token(token, token_type="refresh")
        assert payload["type"] == "refresh"

    def test_wrong_token_type_rejected(self):
        from utils.jwt import create_access_token, verify_token
        from fastapi import HTTPException
        token = create_access_token({"sub": "1"})
        with pytest.raises(HTTPException) as exc:
            verify_token(token, token_type="refresh")
        assert exc.value.status_code == 401

    def test_tampered_token_rejected(self):
        from utils.jwt import verify_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            verify_token("this.is.not.valid", token_type="access")


# ── Cache ─────────────────────────────────────────────────────────────────
class TestCache:
    def test_cache_key_deterministic(self):
        from utils.cache import make_cache_key
        k1 = make_cache_key("resume abc", "jd xyz")
        k2 = make_cache_key("resume abc", "jd xyz")
        assert k1 == k2

    def test_cache_key_unique_per_content(self):
        from utils.cache import make_cache_key
        k1 = make_cache_key("resume A", "jd 1")
        k2 = make_cache_key("resume B", "jd 1")
        k3 = make_cache_key("resume A", "jd 2")
        assert k1 != k2
        assert k1 != k3
        assert k2 != k3

    def test_cache_key_prefix(self):
        from utils.cache import make_cache_key
        k = make_cache_key("text", "jd")
        assert k.startswith("analysis:")

    def test_cache_key_length(self):
        from utils.cache import make_cache_key
        k = make_cache_key("a" * 5000, "b" * 5000)
        assert len(k) == len("analysis:") + 64  # SHA256 hex = 64 chars

    def test_get_cache_no_redis_returns_none(self):
        from utils.cache import get_cached_result
        with patch("utils.cache.get_redis_client", return_value=None):
            result = get_cached_result("any_key")
            assert result is None

    def test_set_cache_no_redis_returns_false(self):
        from utils.cache import set_cached_result
        with patch("utils.cache.get_redis_client", return_value=None):
            result = set_cached_result("key", {"data": 1})
            assert result is False


# ── Embedder ──────────────────────────────────────────────────────────────
class TestEmbedder:
    def test_cosine_similarity_identical_vectors(self):
        from services.embedder import cosine_similarity
        assert cosine_similarity([1.0, 0.0, 0.0], [1.0, 0.0, 0.0]) == 100.0

    def test_cosine_similarity_orthogonal_vectors(self):
        from services.embedder import cosine_similarity
        assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0

    def test_cosine_similarity_clamped(self):
        from services.embedder import cosine_similarity
        score = cosine_similarity([0.9, 0.1], [0.85, 0.15])
        assert 0.0 <= score <= 100.0

    def test_section_text_skills(self):
        from services.embedder import build_resume_section_text
        data = {"skills": ["Python", "FastAPI", "Docker"]}
        text = build_resume_section_text(data, "skills")
        assert "Python" in text
        assert "FastAPI" in text

    def test_section_text_empty_skills(self):
        from services.embedder import build_resume_section_text
        text = build_resume_section_text({"skills": []}, "skills")
        assert text == ""

    def test_section_text_experience(self):
        from services.embedder import build_resume_section_text
        data = {"experience": [{"role": "Engineer", "company": "ACME", "duration": "2y", "description": "Built APIs"}]}
        text = build_resume_section_text(data, "experience")
        assert "Engineer" in text
        assert "ACME" in text

    def test_section_text_education(self):
        from services.embedder import build_resume_section_text
        data = {"education": [{"degree": "BSc", "field": "CS", "institution": "MIT", "year": "2020"}]}
        text = build_resume_section_text(data, "education")
        assert "MIT" in text


# ── Ranker ────────────────────────────────────────────────────────────────
class TestRanker:
    def _make_result(self, id, score):
        from schemas.resume import AnalysisResultOut
        return AnalysisResultOut(
            id=id, resume_id=id,
            skills_score=score, experience_score=score, education_score=score,
            total_score=score, created_at=datetime.now()
        )

    def test_rank_order_descending(self):
        from services.ranker import rank_candidates
        results = [self._make_result(1, 50), self._make_result(2, 90), self._make_result(3, 30)]
        ranked = rank_candidates(results)
        assert ranked[0].total_score == 90
        assert ranked[1].total_score == 50
        assert ranked[2].total_score == 30

    def test_rank_numbers_sequential(self):
        from services.ranker import rank_candidates
        results = [self._make_result(i, float(i * 10)) for i in range(1, 6)]
        ranked = rank_candidates(results)
        for i, r in enumerate(ranked, 1):
            assert r.rank == i

    def test_rank_single_candidate(self):
        from services.ranker import rank_candidates
        ranked = rank_candidates([self._make_result(1, 75.0)])
        assert ranked[0].rank == 1
        assert ranked[0].total_score == 75.0

    def test_rank_empty_list(self):
        from services.ranker import rank_candidates
        assert rank_candidates([]) == []

    def test_summarize_jd_truncates(self):
        from services.ranker import summarize_jd
        long_jd = "word " * 300
        summary = summarize_jd(long_jd, max_length=100)
        assert len(summary) <= 103  # 100 + "..."

    def test_summarize_jd_short_unchanged(self):
        from services.ranker import summarize_jd
        jd = "Short JD text"
        assert summarize_jd(jd) == jd


# ── RAG Chunker ───────────────────────────────────────────────────────────
class TestRAG:
    def test_chunk_produces_multiple_chunks(self):
        from services.rag import chunk_text
        text = " ".join([f"word{i}" for i in range(1200)])
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert len(chunks) > 1

    def test_chunk_overlap_shares_words(self):
        from services.rag import chunk_text
        text = " ".join([f"w{i}" for i in range(600)])
        chunks = chunk_text(text, chunk_size=300, overlap=50)
        # Last word of chunk[0] should appear in chunk[1]
        last_word = chunks[0].split()[-1]
        assert last_word in chunks[1]

    def test_chunk_short_text_single_chunk(self):
        from services.rag import chunk_text
        text = "short text only"
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert len(chunks) == 1
        