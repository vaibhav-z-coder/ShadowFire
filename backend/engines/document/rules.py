"""
Document Authenticity & Offer Letter Fraud Rules.
Contains pattern-based checks for forged documents, fake offer letters,
bogus salary slips, and fraudulent recruitment agreements.
"""

import re
from typing import List, Dict, Any

DOCUMENT_RULES = [
    {
        "rule_id": "doc_upfront_payment",
        "name": "Upfront Fee or Deposit Demand in Document",
        "category": "document_fraud",
        "severity": "critical",
        "evidence_label": "document_upfront_fee_demand",
        "description": "The document mandates candidate/client payments for registration, background checks, training kits, or equipment security.",
        "patterns": [
            r"(?:security\s*deposit|registration\s*fee|training\s*fee|processing\s*charge|onboarding\s*charge|refundable\s*deposit|courier\s*charge|kit\s*fee)",
            r"(?:pay|deposit|transfer)\s*(?:an\s*amount|sum\s*of|rs\.?|inr|\$|\u20b9)\s*[0-9]+",
            r"(?:bank\s*transfer|upi|google\s*pay|phonepe|paytm|crypto)\s*(?:before|prior\s*to)\s*(?:joining|dispatch|appointment)",
            r"(?:laptop|equipment|id\s*card)\s*(?:charge|cost|deposit|fee)"
        ]
    },
    {
        "rule_id": "doc_free_webmail_hr",
        "name": "Official Document Using Free Public Webmail",
        "category": "corporate_impersonation",
        "severity": "high",
        "evidence_label": "free_email_hr_communication",
        "description": "Document uses public disposable webmail (@gmail, @yahoo, @outlook) instead of a verified corporate domain.",
        "patterns": [
            r"[a-zA-Z0-9_.+-]+@(gmail|yahoo|hotmail|outlook|rediffmail|protonmail|aol)\.com",
            r"(?:contact|write\s*to|send\s*to)\s*:\s*[a-zA-Z0-9_.+-]+@(gmail|yahoo|hotmail|outlook)\.com"
        ]
    },
    {
        "rule_id": "doc_chat_interview",
        "name": "Unofficial Interview / Direct Selection on Chat App",
        "category": "recruitment_scam",
        "severity": "high",
        "evidence_label": "chat_app_interview_routing",
        "description": "Document mentions hiring, interview, or appointment was finalized via Telegram, WhatsApp, or instant messaging without formal assessment.",
        "patterns": [
            r"(?:interview|selected|shortlisted|appointed)\s*(?:via|through|on)\s*(?:telegram|whatsapp|hangouts|signal)",
            r"(?:contact\s*our\s*hr|connect\s*with\s*manager)\s*(?:on|via|at)\s*(?:telegram|whatsapp|t\.me\/)",
            r"(?:join\s*the\s*telegram\s*group|reach\s*out\s*on\s*whatsapp)"
        ]
    },
    {
        "rule_id": "doc_unrealistic_compensation",
        "name": "Anomalous Compensation for Unskilled Work",
        "category": "financial_fraud",
        "severity": "high",
        "evidence_label": "unrealistic_compensation_rate",
        "description": "Promises disproportionate income for basic tasks (data entry, ad clicking, typing, review rating).",
        "patterns": [
            r"(?:daily\s*income|earn\s*daily|per\s*day)\s*(?:of\s*)?(?:rs\.?|inr|\$|\u20b9)\s*(?:[3-9]\d{3}|\d{5,})",
            r"(?:data\s*entry|part\s*time\s*typing|copy\s*paste|review\s*submitter)\s*.*\b(?:5[0-9],000|[6-9]\d,000|\d{6,})",
            r"(?:no\s*interview|direct\s*joining|guaranteed\s*appointment|100%\s*selection)"
        ]
    },
    {
        "rule_id": "doc_high_pressure_ultimatum",
        "name": "Coercive Signing Deadline / Legal Threat",
        "category": "social_engineering",
        "severity": "high",
        "evidence_label": "coercive_document_ultimatum",
        "description": "Imposes severe urgency (under 24 hours) or threatens legal litigation / police complaint for non-compliance.",
        "patterns": [
            r"(?:respond|deposit|pay|sign|accept)\s*within\s*(?:24|12|48|2|4)\s*hours",
            r"(?:failure\s*to\s*comply|non-compliance)\s*will\s*lead\s*to\s*(?:legal\s*action|police|court|forfeiture)",
            r"(?:mandatory|strictly\s*enforced|immediate\s*cancellation\s*without\s*refund)"
        ]
    },
    {
        "rule_id": "doc_generic_forged_seals",
        "name": "Generic Visual Seal / Watermark Keywords",
        "category": "forged_document",
        "severity": "medium",
        "evidence_label": "generic_stamp_or_watermark",
        "description": "Uses generic decorative stamp labels often found in template-forged documents.",
        "patterns": [
            r"(?:100%\s*verified\s*company|govt\s*registered\s*authorized|official\s*certified\s*seal)",
            r"(?:iso\s*9001\s*certified\s*scam|ministry\s*approved\s*direct)"
        ]
    },
    {
        "rule_id": "doc_missing_corporate_id",
        "name": "Vague Entity Details / Missing Tax / Registration ID",
        "category": "unverified_issuer",
        "severity": "medium",
        "evidence_label": "unverified_corporate_entity",
        "description": "Claims corporate authority but gives no physical address, registration number (CIN, GSTIN, EIN), or verified company website.",
        "patterns": [
            r"\b(?:registered\s*under\s*govt\s*of\s*india)\b(?!.*\b(?:cin|gstin|u\d{5})\b)",
            r"(?:head\s*office\s*:\s*virtual|address\s*:\s*online)"
        ]
    }
]


def evaluate_document_rules(text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Evaluates document content against forensic authenticity and recruitment fraud patterns.
    """
    if not text:
        return []

    triggered = []
    text_lower = text.lower()

    for rule in DOCUMENT_RULES:
        matches = []
        for pat in rule["patterns"]:
            found = re.findall(pat, text_lower, re.IGNORECASE)
            if found:
                for f in found:
                    match_str = f if isinstance(f, str) else str(f[0])
                    if match_str and match_str not in matches:
                        matches.append(match_str)

        if matches:
            triggered.append({
                "rule_id": rule["rule_id"],
                "name": rule["name"],
                "category": rule["category"],
                "severity": rule["severity"],
                "evidence_label": rule["evidence_label"],
                "description": rule["description"],
                "matches": matches[:5]
            })

    # Metadata rules (e.g. created with Canva, GIMP, Photoshop for official employment offer)
    if metadata:
        software = (metadata.get("software") or metadata.get("creator") or "").lower()
        if any(sw in software for sw in ["canva", "photoshop", "gimp", "paint"]):
            triggered.append({
                "rule_id": "doc_unprofessional_creation_tool",
                "name": f"Document Generated Using Graphic Design Tool ({software.capitalize()})",
                "category": "forged_document",
                "severity": "medium",
                "evidence_label": "graphic_editor_metadata",
                "description": f"Official legal/corporate contracts are typically generated by enterprise document systems (Workday, DocuSign, SAP), not consumer graphic editors like {software}.",
                "matches": [software]
            })

    return triggered
