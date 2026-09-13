from typing import Optional, IO
import os
import uuid
import shutil
from io import BytesIO

from ..config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self):
        self._use_minio = settings.MINIO_ENDPOINT != "local"
        self.base_dir = os.path.join(settings.SEISMIC_DATA_DIR, "storage")
        os.makedirs(self.base_dir, exist_ok=True)

        if self._use_minio:
            try:
                from minio import Minio
                from minio.error import S3Error
                self.S3Error = S3Error
                self.client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_SECURE
                )
                self.bucket = settings.MINIO_BUCKET
                self._ensure_bucket_exists()
            except Exception as e:
                print(f"MinIO not available, using local storage: {e}")
                self._use_minio = False

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except self.S3Error as e:
            print(f"Error creating bucket: {e}")

    def _get_local_path(self, object_name: str) -> str:
        return os.path.join(self.base_dir, object_name)

    def upload_file(self, file_path: str, object_name: Optional[str] = None) -> str:
        if self._use_minio:
            if object_name is None:
                object_name = f"{uuid.uuid4()}/{os.path.basename(file_path)}"
            self.client.fput_object(self.bucket, object_name, file_path)
            return object_name

        if object_name is None:
            object_name = f"{uuid.uuid4()}/{os.path.basename(file_path)}"
        local_path = self._get_local_path(object_name)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        shutil.copy2(file_path, local_path)
        return object_name

    def upload_fileobj(self, file_obj: IO, object_name: str, length: int) -> str:
        if self._use_minio:
            self.client.put_object(self.bucket, object_name, file_obj, length)
            return object_name

        local_path = self._get_local_path(object_name)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(file_obj.read())
        return object_name

    def download_file(self, object_name: str, file_path: str) -> None:
        if self._use_minio:
            self.client.fget_object(self.bucket, object_name, file_path)
            return

        local_path = self._get_local_path(object_name)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        shutil.copy2(local_path, file_path)

    def get_fileobj(self, object_name: str) -> IO:
        if self._use_minio:
            return self.client.get_object(self.bucket, object_name)

        local_path = self._get_local_path(object_name)
        with open(local_path, "rb") as f:
            data = f.read()
        return BytesIO(data)

    def delete_file(self, object_name: str) -> None:
        if self._use_minio:
            self.client.remove_object(self.bucket, object_name)
            return

        local_path = self._get_local_path(object_name)
        if os.path.exists(local_path):
            os.remove(local_path)

    def get_file_url(self, object_name: str, expires_seconds: int = 3600) -> str:
        if self._use_minio:
            return self.client.presigned_get_object(self.bucket, object_name, expires=expires_seconds)
        return f"/storage/{object_name}"

    def file_exists(self, object_name: str) -> bool:
        if self._use_minio:
            try:
                self.client.stat_object(self.bucket, object_name)
                return True
            except self.S3Error:
                return False

        local_path = self._get_local_path(object_name)
        return os.path.exists(local_path)

    def get_file_size(self, object_name: str) -> int:
        if self._use_minio:
            try:
                stat = self.client.stat_object(self.bucket, object_name)
                return stat.size
            except self.S3Error:
                return 0

        local_path = self._get_local_path(object_name)
        return os.path.getsize(local_path) if os.path.exists(local_path) else 0


storage_service = StorageService()
