import time
from typing import Any, Dict, Optional
import requests

DEFAULT_HEADERS = {"User-Agent": "wedefin-public-dashboard/1.0"}

def get_json(url: str, params: Optional[Dict[str, Any]] = None, etag: str | None = None, last_modified: str | None = None, timeout: int = 15) -> tuple[dict | list, dict]:
    headers = dict(DEFAULT_HEADERS)
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified

    r = requests.get(url, params=params, headers=headers, timeout=timeout)
    if r.status_code == 304:
        return {"_not_modified": True}, {"etag": etag, "last_modified": last_modified}
    r.raise_for_status()
    meta = {"etag": r.headers.get("ETag"), "last_modified": r.headers.get("Last-Modified")}
    return r.json(), meta