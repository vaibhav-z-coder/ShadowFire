# AWS Deployment Architecture & Setup Guide

> **Deploying the Digital Trust & Fraud Detection Platform to AWS**

This guide provides practical instructions for deploying the containerized backend and database to AWS using existing AWS credits.

---

## 1. Minimal Production Architecture

```text
                               AWS CLOUD
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   [ Route 53 / CloudFront ]                                            │
│              │                                                         │
│              ▼                                                         │
│     ┌─────────────────────────────────────────────────────────┐        │
│     │               EC2 Instance (t3.medium)                  │        │
│     │   - Docker Engine                                       │        │
│     │   - Nginx Reverse Proxy (SSL / Let's Encrypt)           │        │
│     │   - FastAPI Backend Container (Port 8000)               │        │
│     └─────────────────────────────────────────────────────────┘        │
│              │                                      │                  │
│              ▼                                      ▼                  │
│     ┌──────────────────┐                  ┌──────────────────┐         │
│     │   RDS Database   │                  │    S3 Bucket     │         │
│     │  PostgreSQL 16   │                  │  Temporary Media │         │
│     │ (db.t4g.micro)   │                  │   Upload Vault   │         │
│     └──────────────────┘                  └──────────────────┘         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

> **Design Note**: Use only what the platform actually requires. Do not spin up unnecessary services (e.g. complex Kubernetes clusters) when a streamlined EC2 + RDS + S3 setup is faster, cheaper, and more reliable for a hackathon demo.

---

## 2. Step-by-Step Deployment

### Step A: Push Container to Amazon ECR
```bash
# 1. Authenticate Docker with Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 2. Create Repository
aws ecr create-repository --repository-name digital-trust-backend

# 3. Build & Tag
docker build -t digital-trust-backend .
docker tag digital-trust-backend:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/digital-trust-backend:latest

# 4. Push to ECR
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/digital-trust-backend:latest
```

### Step B: Provision AWS RDS (PostgreSQL)
- **Engine**: PostgreSQL 16
- **Instance Type**: `db.t4g.micro` or `db.t3.micro` (Free Tier eligible)
- **Database Name**: `digital_trust_db`
- Obtain the Endpoint: `digital-trust-db.xxxx.us-east-1.rds.amazonaws.com`

### Step C: EC2 Deployment
1. Launch an Ubuntu 22.04 LTS instance (`t3.medium` recommended for PyTorch/OpenCV).
2. Install Docker & Docker Compose:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   ```
3. Set Environment Variables in `.env`:
   ```bash
   DATABASE_URL=postgresql://trust_admin:PASSWORD@digital-trust-db.xxxx.us-east-1.rds.amazonaws.com:5432/digital_trust_db
   GEMINI_API_KEY=your_gemini_api_key
   ENVIRONMENT=production
   DEBUG=False
   ```
4. Run container:
   ```bash
   docker run -d --name digital_trust_backend --restart always \
     -p 80:8000 --env-file .env \
     <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/digital-trust-backend:latest
   ```

### Step D: S3 Media Storage (Optional)
- Bucket: `digital-trust-media-storage`
- Lifecycle rule: Automatically expire uploaded audio/video files after 24 hours to minimize storage costs.
