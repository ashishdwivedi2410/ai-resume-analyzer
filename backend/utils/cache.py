import json
import hashlib
import redis
from typing import Optional, Any
from config import get_settings
from utils.logger import app_logger

settings = get_settings()

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            _redis_client.ping()
            app_logger.info("Redis connection established")
        except Exception as e:
            app_logger.warning(f"Redis unavailable: {e}. Caching disabled.")
            _redis_client = None
    return _redis_client


def make_cache_key(resume_text: str, jd_text: str) -> str:
    """Generate a deterministic cache key from resume + JD content."""
    combined = f"{resume_text.strip()}||{jd_text.strip()}"
    return "analysis:" + hashlib.sha256(combined.encode()).hexdigest()


def get_cached_result(key: str) -> Optional[dict]:
    client = get_redis_client()
    if not client:
        return None
    try:
        value = client.get(key)
        if value:
            app_logger.debug(f"Cache HIT for key: {key[:20]}...")
            return json.loads(value)
    except Exception as e:
        app_logger.error(f"Cache GET error: {e}")
    return None


def set_cached_result(key: str, data: Any, ttl: int = None) -> bool:
    client = get_redis_client()
    if not client:
        return False
    try:
        ttl = ttl or settings.cache_ttl_seconds
        client.setex(key, ttl, json.dumps(data))
        app_logger.debug(f"Cache SET for key: {key[:20]}... TTL={ttl}s")
        return True
    except Exception as e:
        app_logger.error(f"Cache SET error: {e}")
        return False


def delete_cached_result(key: str) -> bool:
    client = get_redis_client()
    if not client:
        return False
    try:
        client.delete(key)
        return True
    except Exception as e:
        app_logger.error(f"Cache DELETE error: {e}")
        return False
        