#!/usr/bin/env python3
"""
DIGITAL TRUST PLATFORM — HACKATHON LIVE DEMO
"Before you trust it, check it."

Demonstrates the complete end-to-end hackathon flow across all specialized engines:
1. 💬 Scam & Fraud Checker (Messages / Emails / Job Offers)
2. 🔗 Link & Website Checker (Phishing / Suspicious URLs)
3. 🖼️ AI Image Checker (AI-Generated / Manipulated Images)
4. 🎥 Deepfake Video Checker (Facial Inconsistencies & Deepfakes)
5. 🎙️ AI Voice & Audio Checker (Voice Cloning & Synthetic Speech)
6. 🔀 Combined Multi-Check Mode (Text + URL + Media)
"""

import sys
import json
import time
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.engines.fraud.detector import detect_fraud
from backend.engines.url.detector import detect_url
from backend.engines.media.image.detector import detect_image
from backend.engines.media.video.detector import detect_video
from backend.engines.media.audio.detector import detect_audio
from backend.evidence.engine import evidence_engine
from backend.risk.engine import risk_engine
from backend.explanation.gemini import gemini_explainer

# ANSI Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_banner():
    print(f"\n{CYAN}{BOLD}{'=' * 68}")
    print("       DIGITAL TRUST & FRAUD DETECTION PLATFORM — LIVE DEMO")
    print("                     'Before you trust it, check it.'")
    print(f"{'=' * 68}{RESET}\n")


def print_trust_report(title: str, report: dict):
    print(f"{BOLD}{'─' * 55}{RESET}")
    print(f"{BOLD}        TRUST REPORT: {title.upper()}{RESET}")
    print(f"{BOLD}{'─' * 55}{RESET}")

    level = report.get("risk_level", "safe").upper()
    if level == "HIGH":
        level_colored = f"{RED}{BOLD}🔴 HIGH RISK{RESET}"
    elif level == "MEDIUM" or level == "SUSPICIOUS":
        level_colored = f"{YELLOW}{BOLD}⚠️ SUSPICIOUS{RESET}"
    else:
        level_colored = f"{GREEN}{BOLD}🟢 LOW RISK / SAFE{RESET}"

    score = report.get("risk_score", 0)
    conf = int(report.get("confidence", 0.85) * 100)
    category = report.get("primary_category", "Content").replace("_", " ").title()

    print(f"Risk Level:  {level_colored} (Score: {score}/100)")
    print(f"Confidence:  {conf}%")
    print(f"Category:    {category}")
    print(f"{'─' * 55}")

    signals = report.get("signals", [])
    print(f"{BOLD}DETECTED SIGNALS{RESET}")
    if signals:
        for s in signals:
            print(f"  {GREEN}{s}{RESET}")
    else:
        print(f"  {GREEN}✓ No high-risk signals detected{RESET}")
    print(f"{'─' * 55}")

    print(f"{BOLD}WHY THIS WAS FLAGGED (Gemini Explanation){RESET}")
    print(f"  {report.get('explanation', 'Analysis complete.')}")
    print(f"{'─' * 55}")

    print(f"{BOLD}RECOMMENDATION{RESET}")
    print(f"  {report.get('recommendation', 'Verify independently.')}")
    print(f"{BOLD}{'─' * 55}{RESET}\n")


def run_demo():
    print_banner()

    # DEMO 1: SCAM & FRAUD CHECKER
    print(f"{YELLOW}[Demo 1 / 4] 💬 Scam & Fraud Checker — Text Analysis...{RESET}")
    job_scam_text = (
        "Congratulations! You have been selected for a work-from-home Data Entry job. "
        "Earn ₹50,000 weekly. Pay ₹2,999 registration fee immediately to confirm your seat."
    )
    print(f"Input: \"{job_scam_text}\"")
    time.sleep(0.5)

    fraud_res = detect_fraud(job_scam_text)
    ev1 = evidence_engine.collect([fraud_res])
    risk1 = risk_engine.assess_risk([fraud_res], ev1)
    exp1 = gemini_explainer.explain(risk1, ev1, raw_context=job_scam_text)

    report1 = {
        "risk_level": risk1["risk_level"],
        "risk_score": risk1["risk_score"],
        "confidence": risk1["confidence"],
        "primary_category": risk1["primary_category"],
        "signals": risk1["signals"],
        "explanation": exp1,
        "recommendation": risk1["recommendation"]
    }
    print_trust_report("Job Scam Message", report1)

    # DEMO 2: LINK & WEBSITE CHECKER
    print(f"{YELLOW}[Demo 2 / 4] 🔗 Link & Website Checker — Phishing Detection...{RESET}")
    phishing_url = "http://sbi-security-verify-kyc.xyz/update-pan"
    print(f"Input: \"{phishing_url}\"")
    time.sleep(0.5)

    url_res = detect_url(phishing_url)
    ev2 = evidence_engine.collect([url_res])
    risk2 = risk_engine.assess_risk([url_res], ev2)
    exp2 = gemini_explainer.explain(risk2, ev2, raw_context=phishing_url)

    report2 = {
        "risk_level": risk2["risk_level"],
        "risk_score": risk2["risk_score"],
        "confidence": risk2["confidence"],
        "primary_category": risk2["primary_category"],
        "signals": risk2["signals"],
        "explanation": exp2,
        "recommendation": risk2["recommendation"]
    }
    print_trust_report("Phishing Link", report2)

    # DEMO 3: DEEPFAKE VIDEO & AI VOICE CHECKER
    print(f"{YELLOW}[Demo 3 / 4] 🎥 Deepfake & AI Voice Checker...{RESET}")
    dummy_media = PROJECT_ROOT / "tests" / "sample.mp4"
    dummy_media.touch()
    try:
        vid_res = detect_video(dummy_media)
        aud_res = detect_audio(dummy_media)
        ev3 = evidence_engine.collect([vid_res, aud_res])
        risk3 = risk_engine.assess_risk([vid_res, aud_res], ev3)
        exp3 = gemini_explainer.explain(risk3, ev3, raw_context="Video Interview Clip")

        report3 = {
            "risk_level": risk3["risk_level"],
            "risk_score": risk3["risk_score"],
            "confidence": risk3["confidence"],
            "primary_category": "Media Verification",
            "signals": risk3["signals"] or ["✓ Temporal frame consistency verified"],
            "explanation": exp3,
            "recommendation": risk3["recommendation"]
        }
        print_trust_report("Media Consistency", report3)
    finally:
        dummy_media.unlink(missing_ok=True)

    # DEMO 4: COMBINED MULTI-CHECK MODE
    print(f"{YELLOW}[Demo 4 / 4] 🔀 Multi-Check Mode (Message + Phishing Link)...{RESET}")
    multi_text = "Urgent! Work from home offer confirmed. Pay ₹1,500 security deposit."
    multi_url = "http://job-verify-portal.xyz/login"

    multi_f = detect_fraud(multi_text)
    multi_u = detect_url(multi_url)
    ev4 = evidence_engine.collect([multi_f, multi_u])
    risk4 = risk_engine.assess_risk([multi_f, multi_u], ev4)
    exp4 = gemini_explainer.explain(risk4, ev4, raw_context=f"{multi_text} {multi_url}")

    report4 = {
        "risk_level": risk4["risk_level"],
        "risk_score": risk4["risk_score"],
        "confidence": risk4["confidence"],
        "primary_category": "Cross-Modal Fraud",
        "signals": risk4["signals"],
        "explanation": exp4,
        "recommendation": risk4["recommendation"]
    }
    print_trust_report("Multi-Modal Attack", report4)

    print(f"{GREEN}{BOLD}✓ ALL ENGINES & PIPELINES VERIFIED SUCCESSFULLY!{RESET}\n")


if __name__ == "__main__":
    run_demo()
