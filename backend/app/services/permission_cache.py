"""
Permission caching service — reduces DB queries for RBAC checks.

Architecture:
  - In-memory cache with TTL (default: 5 minutes)
  - Thread-safe using threading.Lock
  - Redis-ready: swap MemoryCache for RedisCache when scaling

Cache invalidation:
  - Automatic TTL expiration
  - Manual invalidation via invalidate_user_permissions(user_id)
  - Called when roles are assigned/revoked via admin API

Usage:
    from app.services.permission_cache import permission_cache

    # Get cached permissions (fetches from DB if not cached)
    perms = permission_cache.get_permissions(user_id, db)

    # Invalidate after role change
    permission_cache.invalidate(user_id)
"""

import logging
import threading
import time
from abc import ABC, abstractmethod
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

PERMISSION_CACHE_TTL_SECONDS = 300  # 5 minutes default
PERMISSION_CACHE_MAX_SIZE = 10000  # Max users to cache (LRU eviction)


# ── Cache Interface ───────────────────────────────────────────────────────────


class PermissionCacheBackend(ABC):
    """Abstract interface for permission cache backends."""

    @abstractmethod
    def get(self, user_id: str) -> Optional[set[str]]:
        """Get cached permissions for user. Returns None if not cached."""
        pass

    @abstractmethod
    def set(self, user_id: str, permissions: set[str]) -> None:
        """Cache permissions for user with TTL."""
        pass

    @abstractmethod
    def invalidate(self, user_id: str) -> None:
        """Remove user's permissions from cache."""
        pass

    @abstractmethod
    def invalidate_all(self) -> None:
        """Clear entire cache (e.g., after bulk role changes)."""
        pass

    @abstractmethod
    def stats(self) -> dict:
        """Return cache statistics."""
        pass


# ── In-Memory Implementation ──────────────────────────────────────────────────


class MemoryPermissionCache(PermissionCacheBackend):
    """
    Thread-safe in-memory permission cache with TTL.
    Suitable for single-instance deployments.
    """

    def __init__(self, ttl_seconds: int = PERMISSION_CACHE_TTL_SECONDS, max_size: int = PERMISSION_CACHE_MAX_SIZE):
        self._cache: dict[str, tuple[set[str], float]] = {}  # user_id -> (permissions, expiry_time)
        self._lock = threading.Lock()
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    def get(self, user_id: str) -> Optional[set[str]]:
        with self._lock:
            entry = self._cache.get(user_id)
            if entry is None:
                self._misses += 1
                return None

            permissions, expiry = entry
            if time.time() > expiry:
                # Expired — remove and return None
                del self._cache[user_id]
                self._misses += 1
                return None

            self._hits += 1
            return permissions

    def set(self, user_id: str, permissions: set[str]) -> None:
        with self._lock:
            # LRU eviction if at capacity
            if len(self._cache) >= self._max_size and user_id not in self._cache:
                self._evict_oldest()

            expiry = time.time() + self._ttl
            self._cache[user_id] = (permissions, expiry)

    def invalidate(self, user_id: str) -> None:
        with self._lock:
            self._cache.pop(user_id, None)
            logger.debug(f"Permission cache invalidated for user {user_id}")

    def invalidate_all(self) -> None:
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"Permission cache cleared ({count} entries)")

    def stats(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0
            return {
                "type": "memory",
                "size": len(self._cache),
                "max_size": self._max_size,
                "ttl_seconds": self._ttl,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_percent": round(hit_rate, 1),
            }

    def _evict_oldest(self) -> None:
        """Remove the entry with the earliest expiry time."""
        if not self._cache:
            return
        oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
        del self._cache[oldest_key]


# ── Redis Implementation (placeholder for scaling) ────────────────────────────


class RedisPermissionCache(PermissionCacheBackend):
    """
    Redis-backed permission cache for multi-instance deployments.
    Requires redis-py: pip install redis

    Usage:
        import redis
        redis_client = redis.Redis(host='localhost', port=6379, db=0)
        cache = RedisPermissionCache(redis_client)
    """

    def __init__(self, redis_client, ttl_seconds: int = PERMISSION_CACHE_TTL_SECONDS):
        self._redis = redis_client
        self._ttl = ttl_seconds
        self._key_prefix = "perm:"

    def _key(self, user_id: str) -> str:
        return f"{self._key_prefix}{user_id}"

    def get(self, user_id: str) -> Optional[set[str]]:
        try:
            data = self._redis.smembers(self._key(user_id))
            if data:
                return {p.decode("utf-8") if isinstance(p, bytes) else p for p in data}
            return None
        except Exception as e:
            logger.warning(f"Redis cache get failed: {e}")
            return None

    def set(self, user_id: str, permissions: set[str]) -> None:
        try:
            key = self._key(user_id)
            pipe = self._redis.pipeline()
            pipe.delete(key)
            if permissions:
                pipe.sadd(key, *permissions)
            pipe.expire(key, self._ttl)
            pipe.execute()
        except Exception as e:
            logger.warning(f"Redis cache set failed: {e}")

    def invalidate(self, user_id: str) -> None:
        try:
            self._redis.delete(self._key(user_id))
        except Exception as e:
            logger.warning(f"Redis cache invalidate failed: {e}")

    def invalidate_all(self) -> None:
        try:
            keys = self._redis.keys(f"{self._key_prefix}*")
            if keys:
                self._redis.delete(*keys)
        except Exception as e:
            logger.warning(f"Redis cache clear failed: {e}")

    def stats(self) -> dict:
        try:
            keys = self._redis.keys(f"{self._key_prefix}*")
            return {
                "type": "redis",
                "size": len(keys),
                "ttl_seconds": self._ttl,
            }
        except Exception:
            return {"type": "redis", "error": "connection failed"}


# ── High-Level Cache Service ──────────────────────────────────────────────────


class PermissionCacheService:
    """
    High-level service that wraps cache backend + DB fallback.
    This is the main interface used by rbac.py.
    """

    def __init__(self, backend: PermissionCacheBackend):
        self._backend = backend

    def get_permissions(self, user_id: str, db: Session) -> set[str]:
        """
        Get user permissions — from cache if available, else from DB.
        Automatically populates cache on miss.
        """
        # Try cache first
        cached = self._backend.get(user_id)
        if cached is not None:
            return cached

        # Cache miss — fetch from DB
        from app.models.rbac import Permission, role_permissions, user_roles

        rows = (
            db.query(Permission.code)
            .join(role_permissions, role_permissions.c.permission_id == Permission.id)
            .join(user_roles, user_roles.c.role_id == role_permissions.c.role_id)
            .filter(user_roles.c.user_id == user_id)
            .all()
        )
        permissions = {row.code for row in rows}

        # Populate cache
        self._backend.set(user_id, permissions)

        return permissions

    def invalidate(self, user_id: str) -> None:
        """Invalidate cache for a specific user (call after role changes)."""
        self._backend.invalidate(user_id)

    def invalidate_all(self) -> None:
        """Clear all cached permissions (call after bulk permission changes)."""
        self._backend.invalidate_all()

    def stats(self) -> dict:
        """Return cache statistics."""
        return self._backend.stats()


# ── Global Instance ───────────────────────────────────────────────────────────

# Default to in-memory cache. To use Redis:
#   1. pip install redis
#   2. Set REDIS_URL in config
#   3. Replace this initialization with RedisPermissionCache

_cache_backend = MemoryPermissionCache()
permission_cache = PermissionCacheService(_cache_backend)
