"""
Fraud Detection Engine - Rule Engine.
Defines deterministic, explainable pattern matchers for full-spectrum digital fraud:
- Job & Recruitment Scams
- Advance-Fee & Upfront Payments
- Impersonation & Coercion/Threats
- Credential Harvesting (OTP, Passwords, PINs)
- Unrealistic Financial & Task Scams
- Lottery & Fake Delivery Traps
"""

import re
from typing import List, Dict, Any

FRAUD_RULES = [
    {
        "rule_id": "upfront_payment_request",
        "name": "Upfront Payment or Deposit Demand",
        "category": "financial_fraud",
        "severity": "critical",
        "evidence_label": "upfront_payment_request",
        "description": "Demands fees, registration charges, laptop/kit delivery costs, or security deposits before providing a service, prize, or employment.",
        "patterns": [
            r"(?i)\b(pay|send|transfer|deposit)\b.*?\b(fee|charge|deposit|amount|money|rupees|₹|\$)\b",
            r"(?i)\b(registration|processing|verification|security|joining|admission|training|laptop|kit|delivery)\s+(fee|charges|amount|deposit)\b",
            r"(?i)\brefundable\s+(deposit|amount|fee)\b",
            r"(?i)\bpay\s+(₹|\$|rs\.?|inr|usd)?\s*[\d,]+.*?\b(to\s+confirm|before|immediately)\b"
        ]
    },
    {
        "rule_id": "sensitive_credentials_request",
        "name": "Sensitive Credential or OTP Harvesting",
        "category": "phishing",
        "severity": "critical",
        "evidence_label": "sensitive_credentials_request",
        "description": "Requests sensitive authentication tokens, one-time passwords (OTP), PINs, or card CVVs.",
        "patterns": [
            r"(?i)\b(share|send|enter|submit|provide|verify)\b.*?\b(otp|one[-\s]?time\s+password|pin|cvv|password|passcode)\b",
            r"(?i)\b(pan|aadhaar|social\s+security|ssn)\b.*?\b(submit|update|verify|upload)\b.*?\b(link|click|portal)\b",
            r"(?i)\bupdate\s+credit\s+card\b"
        ]
    },
    {
        "rule_id": "threat_account_suspension",
        "name": "Urgent Threat or Account Suspension Coercion",
        "category": "social_engineering",
        "severity": "high",
        "evidence_label": "urgency_coercion_threat",
        "description": "Pressures victim with threats of account deactivation, disconnection, legal action, or police arrest.",
        "patterns": [
            r"(?i)\b(account|connection|service|card|membership)\b.*?\b(blocked|suspended|deactivated|disconnected|terminated|expired)\b",
            r"(?i)\b(avoid|prevent)\s+(arrest|penalty|legal\s+action|suspension|deactivation)\b",
            r"(?i)\b(police|court|warrant|income\s+tax)\b.*?\b(issued|arrest|notice|fine)\b",
            r"(?i)\b(pending|incomplete)\s+kyc\b.*?\b(block|suspend|update)\b"
        ]
    },
    {
        "rule_id": "unrealistic_financial_promise",
        "name": "Unrealistic Financial Return or Daily Income",
        "category": "financial_fraud",
        "severity": "high",
        "evidence_label": "unrealistic_financial_claim",
        "description": "Promises implausible returns, effortless daily earnings, or zero-risk automated doubling.",
        "patterns": [
            r"(?i)\b(earn|make)\s+(₹|\$|rs\.?)?\s*[\d,]+\s*(daily|per\s+day|everyday|per\s+hour)\b",
            r"(?i)\b(guaranteed|fixed|assured)\s+(return|income|profit|payout)\b",
            r"(?i)\b(invest|deposit)\s+(₹|\$|rs\.?)?\s*[\d,]+.*?\b(get|earn|doubl)\b",
            r"(?i)\b(zero|no)\s+risk\b.*?\b(profit|return|trading)\b"
        ]
    },
    {
        "rule_id": "unsolicited_selection",
        "name": "Unsolicited Selection or Hiring Without Interview",
        "category": "job_scam",
        "severity": "medium",
        "evidence_label": "unsolicited_job_offer",
        "description": "Announces that the recipient was selected or confirmed for an offer they never interviewed for.",
        "patterns": [
            r"(?i)\b(congratulations|congrats)\b.*?\b(selected|shortlisted|chosen|hired)\b.*?\b(job|role|vacancy|position|work[-\s]?from[-\s]?home)\b",
            r"(?i)\byou\s+are\s+selected\s+for\b.*?\b(job|part[-\s]?time|data\s+entry)\b",
            r"(?i)\boffer\s+letter\s+(attached|confirmed)\b.*?\bwithout\b.*?\binterview\b"
        ]
    },
    {
        "rule_id": "task_and_video_scam",
        "name": "Task Scam (Liking Videos, Reviewing Maps)",
        "category": "job_scam",
        "severity": "high",
        "evidence_label": "task_based_scam_pattern",
        "description": "Offers payment for menial tasks like liking videos, rating merchants, or following social accounts.",
        "patterns": [
            r"(?i)\b(liking|like|subscribe)\s+(youtube|tiktok|instagram)\s+(videos|channels)\b",
            r"(?i)\b(rating|rate|review)\s+(google\s+maps|products|hotels)\b",
            r"(?i)\b(part[-\s]?time\s+task|prepaid\s+task|recharge\s+task)\b"
        ]
    },
    {
        "rule_id": "off_platform_communication",
        "name": "Routing to Encrypted Off-Platform Channels",
        "category": "social_engineering",
        "severity": "medium",
        "evidence_label": "off_platform_redirect",
        "description": "Directs recruitment or financial dialogue onto unmonitored messaging channels (Telegram, WhatsApp).",
        "patterns": [
            r"(?i)\b(contact|message|reach)\b.*?\b(telegram|whatsapp)\b",
            r"(?i)@\w+\s+(on\s+telegram|telegram)\b",
            r"(?i)t\.me\/\w+"
        ]
    },
    {
        "rule_id": "lottery_prize_claim",
        "name": "Unsolicited Lottery or Sweepstakes Prize",
        "category": "lottery_scam",
        "severity": "high",
        "evidence_label": "fake_lottery_prize",
        "description": "Claims recipient won millions in an unentered sweepstakes, lottery, or international lucky draw.",
        "patterns": [
            r"(?i)\b(you\s+have\s+won|winner\s+of)\b.*?\b(lottery|sweepstakes|lucky\s+draw|jackpot|promo)\b",
            r"(?i)\b(won|claim)\s+(£|\$|€|₹)\s*[\d,]+\b",
            r"(?i)\b(claims\s+agent|lottery\s+coordinator)\b"
        ]
    },
    {
        "rule_id": "courier_customs_scam",
        "name": "Fake Courier / Parcel Customs Hold",
        "category": "courier_scam",
        "severity": "medium",
        "evidence_label": "courier_package_hold",
        "description": "Falsely claims a package is on hold pending small customs/address fee payment.",
        "patterns": [
            r"(?i)\b(package|parcel|delivery|shipment)\b.*?\b(on\s+hold|undelivered|pending|customs)\b",
            r"(?i)\b(unpaid|small|address\s+update)\s+(fee|customs|charge)\b"
        ]
    },
    {
        "rule_id": "urgency_language",
        "name": "Artificial Urgency & Time Pressure",
        "category": "social_engineering",
        "severity": "medium",
        "evidence_label": "urgency_language",
        "description": "Uses tight deadlines and pressure tactics to rush victim decision making.",
        "patterns": [
            r"(?i)\b(immediately|right\s+now|urgent|urgently|act\s+fast|hurry|instant|within\s+\d+\s*(mins|minutes|hours))\b",
            r"(?i)\b(limited\s+time|expires\s+today|valid\s+only\s+today|last\s+chance)\b"
        ]
    }
]


def evaluate_rules(text: str) -> List[Dict[str, Any]]:
    """
    Evaluates rule patterns against input message and returns triggered rule records.
    """
    triggered_rules = []
    
    for rule in FRAUD_RULES:
        matches = []
        for pattern in rule["patterns"]:
            found = re.findall(pattern, text)
            if found:
                for match in found:
                    if isinstance(match, tuple):
                        match_str = " ".join([m for m in match if m]).strip()
                    else:
                        match_str = str(match).strip()
                    if match_str and match_str not in matches:
                        matches.append(match_str)
        
        if matches:
            triggered_rules.append({
                "rule_id": rule["rule_id"],
                "name": rule["name"],
                "category": rule["category"],
                "severity": rule["severity"],
                "evidence_label": rule["evidence_label"],
                "description": rule["description"],
                "matches": matches[:3]  # Keep top representative matches
            })
            
    return triggered_rules
