"""
Bonus RAG Service — ChromaDB-based retrieval augmented generation.
Stores resume chunks as vectors and retrieves relevant context
to enhance scoring and feedback quality.
"""
import uuid
from typing import List, Optional, Dict, Any
from config import get_settings
from utils.logger import app_logger

settings = get_settings()

_chroma_client = None
_collection = None


def get_chroma_collection():
    """Lazy-load ChromaDB collection."""
    global _chroma_client, _collection
    if _collection is None:
        try:
            import chromadb
            _chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
            _collection = _chroma_client.get_or_create_collection(
                name=settings.chroma_collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            app_logger.info(f"ChromaDB collection '{settings.chroma_collection_name}' ready")
        except ImportError:
            app_logger.warning("ChromaDB not installed — RAG features disabled")
            return None
        except Exception as e:
            app_logger.error(f"ChromaDB init error: {e}")
            return None
    return _collection


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for vector storage."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


async def index_resume(resume_id: int, raw_text: str, metadata: Dict[str, Any] = None) -> bool:
    """
    Chunk and store a resume in ChromaDB for later retrieval.
    """
    collection = get_chroma_collection()
    if not collection:
        return False

    try:
        chunks = chunk_text(raw_text)
        ids = [f"resume_{resume_id}_chunk_{i}" for i in range(len(chunks))]
        meta = [
            {**(metadata or {}), "resume_id": str(resume_id), "chunk_index": i}
            for i in range(len(chunks))
        ]

        # Delete existing chunks for this resume (re-index)
        existing = collection.get(where={"resume_id": str(resume_id)})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])

        collection.add(documents=chunks, ids=ids, metadatas=meta)
        app_logger.info(f"Indexed resume {resume_id}: {len(chunks)} chunks stored in ChromaDB")
        return True

    except Exception as e:
        app_logger.error(f"ChromaDB indexing error: {e}")
        return False


async def retrieve_relevant_context(jd_text: str, top_k: int = 5) -> str:
    """
    Retrieve the most relevant resume chunks for a given JD query.
    Returns concatenated context string.
    """
    collection = get_chroma_collection()
    if not collection:
        return ""

    try:
        results = collection.query(
            query_texts=[jd_text[:1000]],
            n_results=min(top_k, collection.count())
        )

        docs = results.get("documents", [[]])[0]
        context = "\n---\n".join(docs)
        app_logger.debug(f"RAG retrieved {len(docs)} chunks for JD query")
        return context

    except Exception as e:
        app_logger.error(f"ChromaDB retrieval error: {e}")
        return ""


async def retrieve_for_resume(resume_id: int, query: str, top_k: int = 3) -> str:
    """Retrieve relevant chunks from a specific resume."""
    collection = get_chroma_collection()
    if not collection:
        return ""

    try:
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where={"resume_id": str(resume_id)}
        )
        docs = results.get("documents", [[]])[0]
        return "\n".join(docs)
    except Exception as e:
        app_logger.error(f"ChromaDB resume retrieval error: {e}")
        return ""