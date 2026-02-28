from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class InMemoryState:
    latest_simulation: dict[str, Any] | None = None
    latest_compare: dict[str, Any] | None = None


STATE = InMemoryState()

