# Digital Trust & Fraud Detection Platform

> **"Before you trust it, check it."**

A modular AI-powered Digital Trust Platform that analyzes digital messages, URLs, images, videos, and audio using specialized detection engines, combines their evidence into a risk assessment, and generates an understandable trust report.

---

## Architecture Overview

```text
                         DIGITAL TRUST PLATFORM
                                  │
                                  ▼
                           ┌──────────────┐
                           │  USER INPUT  │
                           └───────┬──────┘
                                   │
                   ┌───────────────┼────────────────┐
                   │               │                │
                   ▼               ▼                ▼
                 TEXT             URL             MEDIA
                   │               │         ┌──────┼──────┐
                   ▼               ▼         ▼      ▼      ▼
             Fraud Engine     URL Engine   Image  Video  Audio
                                           Engine  Engine  Engine
                   │               │         │      │      │
                   └───────────────┴─────────┴──────┴──────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ EVIDENCE ENGINE │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │   RISK ENGINE   │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  EXPLANATION    │
                                  │     LAYER       │
                                  │     Gemini      │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  TRUST REPORT   │
                                  └─────────────────┘
```

---

## Target Project Structure

```text
digital-trust-platform/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
│
├── backend/
│   ├── main.py
│   ├── api/
│   │   ├── fraud.py
│   │   ├── url.py
│   │   ├── media.py
│   │   └── analysis.py
│   ├── engines/
│   │   ├── fraud/
│   │   │   ├── detector.py
│   │   │   ├── features.py
│   │   │   ├── rules.py
│   │   │   └── model.py
│   │   ├── url/
│   │   │   ├── detector.py
│   │   │   ├── features.py
│   │   │   ├── rules.py
│   │   │   └── model.py
│   │   └── media/
│   │       ├── image/
│   │       ├── video/
│   │       └── audio/
│   ├── evidence/
│   │   └── engine.py
│   ├── risk/
│   │   └── engine.py
│   ├── explanation/
│   │   └── gemini.py
│   ├── utils/
│   │   ├── logger.py
│   │   └── file_handler.py
│   └── config/
│       └── settings.py
│
├── models/
│   ├── fraud/
│   ├── phishing/
│   ├── image/
│   ├── video/
│   └── audio/
│
├── datasets/
│   ├── fraud/
│   ├── phishing/
│   └── media/
│
├── tests/
│   ├── fraud/
│   ├── url/
│   └── media/
│
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

---

## Core Detection Principle

```text
Specialized Engines (Detect WHAT was found)
       ↓
Evidence Engine (Aggregates signals)
       ↓
Risk Engine (Determines HOW evidence combines)
       ↓
Gemini Explanation Layer (Explains WHY in human-readable terms)
       ↓
Digital Trust Report
```

---

## Quickstart

### Run Python Tests
```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

### Run FastAPI Backend
```bash
uvicorn backend.main:app --reload --port 8000
```
