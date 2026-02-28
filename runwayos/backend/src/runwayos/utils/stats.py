from __future__ import annotations

import numpy as np


def compute_cash_percentiles(cash_paths: np.ndarray) -> dict[str, list[float]]:
    months = np.arange(cash_paths.shape[1], dtype=np.int64)
    p5, p50, p95 = np.percentile(cash_paths, [5, 50, 95], axis=0)
    return {
        "months": months.astype(int).tolist(),
        "p5": p5.astype(float).tolist(),
        "p50": p50.astype(float).tolist(),
        "p95": p95.astype(float).tolist(),
    }


def compute_ruin_probability_by_month(cash_paths: np.ndarray) -> dict[str, list[float]]:
    min_prefix = np.minimum.accumulate(cash_paths, axis=1)
    ruined_by_month = min_prefix < 0.0
    p_ruin = ruined_by_month.mean(axis=0)
    months = np.arange(cash_paths.shape[1], dtype=np.int64)
    return {"months": months.astype(int).tolist(), "p_ruin": p_ruin.astype(float).tolist()}


def median_ruin_month_if_ruined(cash_paths: np.ndarray) -> int | None:
    below_zero = cash_paths < 0.0
    ruined = below_zero.any(axis=1)
    if not np.any(ruined):
        return None
    first_ruin_month = np.argmax(below_zero[ruined], axis=1)
    return int(np.median(first_ruin_month))

