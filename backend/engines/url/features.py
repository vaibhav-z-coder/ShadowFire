"""
URL Feature Extraction.
Calculates lexical, structural, and character-distribution metrics for URLs.
"""

import math
from typing import Dict, Any
from urllib.parse import urlparse


def calculate_entropy(text: str) -> float:
    """Calculates Shannon entropy of string to measure randomness/obfuscation."""
    if not text:
        return 0.0
    length = len(text)
    prob = [float(text.count(c)) / length for c in dict.fromkeys(list(text))]
    return -sum([p * math.log2(p) for p in prob if p > 0])


def extract_url_features(url: str) -> Dict[str, Any]:
    """
    Extracts structural and lexical feature vectors from a URL.
    """
    raw_url = url.strip()
    normalized = raw_url.lower()
    if not (normalized.startswith("http://") or normalized.startswith("https://")):
        normalized = "http://" + normalized

    parsed = urlparse(normalized)
    hostname = parsed.hostname or ""
    path = parsed.path or ""

    return {
        "url_length": len(raw_url),
        "hostname_length": len(hostname),
        "path_length": len(path),
        "num_dots": raw_url.count("."),
        "num_hyphens": raw_url.count("-"),
        "num_underscores": raw_url.count("_"),
        "num_slashes": raw_url.count("/"),
        "num_at_symbols": raw_url.count("@"),
        "num_digits": sum(c.isdigit() for c in raw_url),
        "is_https": raw_url.lower().startswith("https://"),
        "has_ip_host": any(part.isdigit() for part in hostname.split(".")),
        "hostname_entropy": round(calculate_entropy(hostname), 3),
        "url_entropy": round(calculate_entropy(raw_url), 3),
        "subdomain_count": max(0, len(hostname.split(".")) - 2)
    }
