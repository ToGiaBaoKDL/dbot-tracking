"""DBOT API client for stock data crawling."""

import time
from datetime import datetime

import httpx

DBOT_BASE_URL = "https://dbot.vn/dashboard/api"
INDEX_SYMBOLS = frozenset({"VNINDEX", "VNXALL", "HNXINDEX", "UPCOMINDEX", "VN30", "HNX30"})


def _get_dbot_headers(token: str) -> dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://dbot.vn/dashboard/",
        "Authorization": f"Bearer {token}",
    }


class DbotClient:
    """HTTP client for DBOT API."""

    def __init__(self, token: str, timeout: float = 60.0):
        self.token = token
        self._client = httpx.Client(
            timeout=timeout,
            headers=_get_dbot_headers(token),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    def _fetch(self, url: str, retries: int = 3) -> list:
        last_exc: Exception | None = None
        for attempt in range(retries):
            try:
                resp = self._client.get(url)
                resp.raise_for_status()
                data = resp.json()
                if not data.get("success"):
                    raise RuntimeError(f"DBOT API error: {data.get('message')}")
                return data.get("data", [])
            except (httpx.HTTPStatusError, httpx.NetworkError, httpx.TimeoutException) as exc:
                last_exc = exc
                if attempt < retries - 1:
                    time.sleep(2**attempt)
                continue
        if last_exc is not None:
            raise last_exc
        return []

    def get_all_symbols(self) -> list[str]:
        """Fetch all stock symbols from DBOT."""
        ts = int(datetime.now().timestamp() * 1000)
        url = f"{DBOT_BASE_URL}?method=get&cmd=get_all_symbols&_={ts}"
        return self._fetch(url)

    def get_daily_all(self) -> list[dict]:
        """Fetch all stocks for current day."""
        ts = int(datetime.now().timestamp() * 1000)
        url = f"{DBOT_BASE_URL}?method=get&cmd=get_dttb_stocks&_={ts}"
        return self._fetch(url)

    def get_history_single(self, symbol: str) -> list[dict]:
        """Fetch full history for a single symbol."""
        ts = int(datetime.now().timestamp() * 1000)
        url = f"{DBOT_BASE_URL}?method=get&cmd=get_dttb_stocks&single=1&search={symbol}&_={ts}"
        return self._fetch(url)

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


def filter_index_symbols(symbols: list[str]) -> list[str]:
    return [s for s in symbols if s not in INDEX_SYMBOLS]


def transform_dbot_record(raw: dict) -> dict | None:
    """Transform DBOT API record to DB schema."""
    symbol = raw.get("symbol")
    record_date = raw.get("recordDate")
    if not symbol or not record_date:
        return None
    signal = str(raw.get("signal", "")).strip().upper()
    return {
        "symbol": symbol,
        "record_date": record_date,
        "close_price": raw.get("price"),
        "volume": raw.get("vol"),
        "prev_price": raw.get("prevPrice"),
        "signal": signal if signal in ("BUY", "SELL") else None,
        "source_id": raw.get("id"),
    }
