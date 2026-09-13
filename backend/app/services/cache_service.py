from typing import Optional, Any
import json
import pickle
import time
from collections import OrderedDict

from ..config import get_settings

settings = get_settings()


class CacheService:
    def __init__(self):
        self._cache: OrderedDict = OrderedDict()
        self._use_redis = not settings.REDIS_URL.startswith("memory")
        if self._use_redis:
            try:
                import redis
                self.redis_client = redis.from_url(settings.REDIS_URL)
            except Exception as e:
                print(f"Redis not available, using memory cache: {e}")
                self._use_redis = False

    def _clean_expired(self):
        now = time.time()
        keys_to_delete = [k for k, (_, exp) in self._cache.items() if exp is not None and exp < now]
        for k in keys_to_delete:
            del self._cache[k]

    def get(self, key: str) -> Optional[Any]:
        if self._use_redis:
            try:
                data = self.redis_client.get(key)
                if data is None:
                    return None
                return pickle.loads(data)
            except Exception:
                return None
        self._clean_expired()
        if key in self._cache:
            value, expire = self._cache[key]
            if expire is None or expire > time.time():
                return value
            del self._cache[key]
        return None

    def set(self, key: str, value: Any, expire_seconds: int = 3600) -> None:
        if self._use_redis:
            try:
                self.redis_client.setex(key, expire_seconds, pickle.dumps(value))
                return
            except Exception as e:
                print(f"Cache set error: {e}")
        expire = time.time() + expire_seconds if expire_seconds else None
        self._cache[key] = (value, expire)
        if len(self._cache) > 1000:
            self._cache.popitem(last=False)

    def delete(self, key: str) -> None:
        if self._use_redis:
            try:
                self.redis_client.delete(key)
                return
            except Exception as e:
                print(f"Cache delete error: {e}")
        if key in self._cache:
            del self._cache[key]

    def get_json(self, key: str) -> Optional[dict]:
        if self._use_redis:
            try:
                data = self.redis_client.get(key)
                if data is None:
                    return None
                return json.loads(data)
            except Exception:
                return None
        data = self.get(key)
        if isinstance(data, str):
            try:
                return json.loads(data)
            except Exception:
                return None
        return data if isinstance(data, dict) else None

    def set_json(self, key: str, value: dict, expire_seconds: int = 3600) -> None:
        if self._use_redis:
            try:
                self.redis_client.setex(key, expire_seconds, json.dumps(value))
                return
            except Exception as e:
                print(f"Cache set JSON error: {e}")
        self.set(key, value, expire_seconds)


cache_service = CacheService()
