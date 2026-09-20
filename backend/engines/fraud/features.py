"""
Fraud Detection Engine - Feature Extraction.
Extracts measurable numerical and structured characteristics from digital communication.
"""

import re
from typing import Dict, Any, List

# Keyword lists for token frequencies
URGENCY_TOKENS = {
    "immediately", "urgent", "urgently", "now", "hurry", "instant", "instantly",
    "expire", "expires", "deadline", "today", "limited", "quick", "fast", "action"
}

PAYMENT_TOKENS = {
    "pay", "payment", "fee", "fees", "deposit", "charge", "charges", "cost", "price",
    "salary", "earn", "income", "money", "rupees", "inr", "usd", "cash", "upi", "card",
    "transfer", "bank", "account", "payout", "refund", "refundable"
}

SUSPICIOUS_TOKENS = {
    "guaranteed", "selected", "congratulations", "winner", "won", "lottery", "prize",
    "claim", "sweepstakes", "telegram", "whatsapp", "kyc", "otp", "pin", "cvv",
    "password", "secret", "verify", "blocked", "suspended", "deactivated", "warrant"
}

CURRENCY_REGEX = r"(?:₹|\$|€|£|rs\.?|inr|usd)\s*[\d,]+(?:\.\d{1,2})?|\b[\d,]+(?:\.\d{1,2})?\s*(?:rupees|dollars|inr|usd)\b"
PHONE_REGEX = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b"
EMAIL_REGEX = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
URL_REGEX = r"https?:\/\/[^\s]+|www\.[^\s]+"


def extract_features(text: str) -> Dict[str, Any]:
    """
    Extracts numerical feature vector and entity mentions from text.
    """
    words = re.findall(r"\b\w+\b", text.lower())
    total_words = len(words)
    total_chars = len(text)

    # Entity extractions
    urls = re.findall(URL_REGEX, text)
    phone_numbers = re.findall(PHONE_REGEX, text)
    emails = re.findall(EMAIL_REGEX, text)
    monetary_mentions = re.findall(CURRENCY_REGEX, text, re.IGNORECASE)

    # Word frequencies
    urgency_count = sum(1 for w in words if w in URGENCY_TOKENS)
    payment_count = sum(1 for w in words if w in PAYMENT_TOKENS)
    suspicious_count = sum(1 for w in words if w in SUSPICIOUS_TOKENS)

    # Formatting metrics
    uppercase_chars = sum(1 for c in text if c.isupper())
    uppercase_ratio = round(uppercase_chars / max(total_chars, 1), 3)
    exclamation_count = text.count("!")
    question_count = text.count("?")

    return {
        "message_length": total_chars,
        "word_count": total_words,
        "url_count": len(urls),
        "urls": urls,
        "phone_count": len(phone_numbers),
        "phone_numbers": phone_numbers,
        "email_count": len(emails),
        "emails": emails,
        "monetary_mentions_count": len(monetary_mentions),
        "monetary_values": monetary_mentions,
        "urgency_words_count": urgency_count,
        "payment_words_count": payment_count,
        "suspicious_words_count": suspicious_count,
        "uppercase_ratio": uppercase_ratio,
        "exclamation_count": exclamation_count,
        "question_count": question_count,
        "digit_count": sum(c.isdigit() for c in text)
    }
