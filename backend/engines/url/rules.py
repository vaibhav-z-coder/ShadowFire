"""
URL & Phishing Detection Rules.
Defines heuristic and pattern-based indicators for suspicious domains and URLs.
"""

import re
from typing import List, Dict, Any
from urllib.parse import urlparse

SUSPICIOUS_TLDS = {
    ".xyz", ".top", ".work", ".click", ".buzz", ".guru", ".rest",
    ".fit", ".gq", ".ml", ".cf", ".tk", ".ga", ".surf", ".country"
}

TARGET_BRANDS = [
    "google", "microsoft", "paypal", "apple", "amazon", "netflix",
    "facebook", "instagram", "whatsapp", "sbi", "hdfc", "icici",
    "paytm", "phonepe", "bank", "wellsfargo", "chase", "binance"
]

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "secure", "account", "update",
    "banking", "password", "credential", "confirm", "wallet", "recover",
    "kyc", "free-gift", "claim-reward"
]


def evaluate_url_rules(url: str) -> List[Dict[str, Any]]:
    """
    Evaluates pattern-based phishing and deception indicators in a URL.
    """
    triggered = []
    normalized_url = url.strip().lower()
    if not (normalized_url.startswith("http://") or normalized_url.startswith("https://")):
        normalized_url = "http://" + normalized_url

    parsed = urlparse(normalized_url)
    hostname = parsed.hostname or ""
    path = parsed.path or ""
    full_url = normalized_url

    # 1. IP address instead of domain
    ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
    if re.match(ip_pattern, hostname):
        triggered.append({
            "rule_id": "ip_address_host",
            "name": "Host is Direct IP Address",
            "category": "phishing",
            "severity": "critical",
            "evidence_label": "ip_host_detected",
            "description": "Legitimate organizations rarely use bare IP addresses instead of registered domain names.",
            "matches": [hostname]
        })

    # 2. Brand impersonation / Typosquatting
    for brand in TARGET_BRANDS:
        if brand in hostname and not (hostname.endswith(f".{brand}.com") or hostname == f"{brand}.com"):
            triggered.append({
                "rule_id": "brand_impersonation",
                "name": f"Target Brand Impersonation ({brand.capitalize()})",
                "category": "phishing",
                "severity": "high",
                "evidence_label": f"brand_impersonation_{brand}",
                "description": f"Domain references '{brand}' in hostname without being an official domain.",
                "matches": [hostname]
            })
            break

    # 3. Suspicious TLD
    for tld in SUSPICIOUS_TLDS:
        if hostname.endswith(tld):
            triggered.append({
                "rule_id": "suspicious_tld",
                "name": "High-Risk Top Level Domain",
                "category": "suspicious_infrastructure",
                "severity": "medium",
                "evidence_label": "suspicious_tld",
                "description": f"The domain uses '{tld}', a top-level domain frequently associated with throwaway phishing infrastructure.",
                "matches": [tld]
            })
            break

    # 4. Excessive subdomains or hyphens
    subdomain_parts = hostname.split(".")
    if len(subdomain_parts) > 4:
        triggered.append({
            "rule_id": "excessive_subdomains",
            "name": "Excessive Subdomains",
            "category": "phishing",
            "severity": "medium",
            "evidence_label": "excessive_subdomain_structure",
            "description": "Phishers use complex subdomain hierarchies to disguise the real host.",
            "matches": [hostname]
        })

    if hostname.count("-") >= 3:
        triggered.append({
            "rule_id": "excessive_hyphens",
            "name": "Excessive Hyphenation in Host",
            "category": "phishing",
            "severity": "low",
            "evidence_label": "hyphenated_domain_structure",
            "description": "Multiple hyphens in the domain name are common in lookalike spoof domains.",
            "matches": [hostname]
        })

    # 5. Phishing keywords in URL path / parameters
    matched_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in (path + (parsed.query or ""))]
    if matched_keywords:
        triggered.append({
            "rule_id": "credential_keywords",
            "name": "Credential Harvesting Keywords",
            "category": "phishing",
            "severity": "medium",
            "evidence_label": "credential_harvesting_path",
            "description": "URL path contains authentication or security terms commonly used in credential harvest traps.",
            "matches": matched_keywords
        })

    # 6. Basic HTTP for sensitive contexts
    if normalized_url.startswith("http://") and matched_keywords:
        triggered.append({
            "rule_id": "insecure_http_sensitive",
            "name": "Insecure HTTP on Authentication Form",
            "category": "phishing",
            "severity": "high",
            "evidence_label": "unencrypted_sensitive_url",
            "description": "Authentication endpoints must use encrypted HTTPS; unencrypted HTTP indicates fraud.",
            "matches": ["http://"]
        })

    return triggered
