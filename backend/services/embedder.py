from typing import List, Optional
import numpy as np
from utils.logger import app_logger

_model = None
MODEL_NAME = "all-MiniLM-L6-v2"


def get_embedding_model():
    """Lazy-load the sentence-transformer model."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            app_logger.info(f"Loading embedding model: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME)
            app_logger.info("Embedding model loaded successfully")
        except ImportError:
            app_logger.error("sentence-transformers not installed")
            raise RuntimeError("sentence-transformers is required for embedding-based matching")
    return _model


def generate_embedding(text: str) -> List[float]:
    """Generate a single embedding vector for the given text."""
    model = get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a batch of texts efficiently."""
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return embeddings.tolist()


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two normalized embedding vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    # Since both are L2-normalized, dot product == cosine similarity
    sim = float(np.dot(a, b))
    # Clamp to [0, 1] range and scale to 0–100
    return max(0.0, min(1.0, sim)) * 100


def build_resume_section_text(parsed_data: dict, section: str) -> str:
    """
    Build a meaningful text string for a specific resume section
    to use in embedding similarity scoring.
    """
    if section == "skills":
        skills = parsed_data.get("skills", [])
        return "Skills: " + ", ".join(skills) if skills else ""

    elif section == "experience":
        items = parsed_data.get("experience", [])
        parts = []
        for exp in items:
            role = exp.get("role", "")
            company = exp.get("company", "")
            desc = exp.get("description", "")
            parts.append(f"{role} at {company}. {desc}")
        return " | ".join(parts)

    elif section == "education":
        items = parsed_data.get("education", [])
        parts = []
        for edu in items:
            degree = edu.get("degree", "")
            field = edu.get("field", "")
            institution = edu.get("institution", "")
            parts.append(f"{degree} in {field} from {institution}")
        return " | ".join(parts)

    return ""
