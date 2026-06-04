import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import os

os.makedirs("logs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)


@pytest.fixture(scope="session")
def app():
    with patch("db.database.create_engine") as mock_eng, \
         patch("db.database.Base.metadata.create_all"), \
         patch("services.embedder.get_embedding_model"):
        mock_eng.return_value = MagicMock()
        from main import app as fastapi_app
        yield fastapi_app


@pytest.fixture(scope="session")
def client(app):
    return TestClient(app)


@pytest.fixture
def sample_jd():
    return """We are looking for a Senior Python Developer.
    Requirements: 4+ years Python, FastAPI, PostgreSQL, Docker, AWS, Redis.
    Nice to have: ML/AI experience, vector databases."""


@pytest.fixture
def sample_resume_text():
    return """
    John Doe
    john.doe@email.com | +1-555-0100 | San Francisco, CA

    SUMMARY
    Backend engineer with 5 years of Python experience building scalable APIs.

    SKILLS
    Python, FastAPI, Django, PostgreSQL, Redis, Docker, AWS, Kubernetes, Git

    EXPERIENCE
    Senior Backend Engineer — TechCorp (2021 – Present)
    Built high-throughput REST APIs serving 1M+ daily requests using FastAPI and PostgreSQL.

    Backend Developer — StartupXYZ (2019 – 2021)
    Developed microservices with Docker and deployed to AWS ECS.

    EDUCATION
    B.Sc. Computer Science — Stanford University, 2019
    """