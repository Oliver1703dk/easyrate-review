# EasyRate Setup Guide

Complete setup guide for running the EasyRate review management platform in development and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [External Services](#external-services)
- [Platform Integrations](#platform-integrations)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Verification & Health Checks](#verification--health-checks)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd easyrate_review
pnpm install

# 2. Copy environment template
cp apps/backend/.env.example apps/backend/.env

# 3. Start MongoDB locally
brew services start mongodb-community  # macOS
# or use Docker: docker run -d -p 27017:27017 mongo:7

# 4. Start development servers
pnpm dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Prerequisites

### System Requirements

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | >= 20.0.0 | Runtime |
| pnpm | 9.15.0 | Package manager |
| MongoDB | >= 7.0 | Database |
| Git | Latest | Version control |

### Install pnpm

```bash
# Using corepack (recommended)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Or via npm
npm install -g pnpm@9.15.0
```

---

## Environment Variables

Create `apps/backend/.env` with the following variables:

### Required for Basic Operation

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/easyrate

# Authentication (CHANGE IN PRODUCTION)
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS and review links)
FRONTEND_URL=http://localhost:3000
```

### SMS Provider (Gateway API)

Required for sending SMS notifications.

```bash
GATEWAYAPI_API_KEY=your-gateway-api-key
GATEWAYAPI_SENDER_ID=EasyRate
GATEWAYAPI_WEBHOOK_SECRET=your-webhook-secret  # Optional, for delivery status
```

**Setup Steps:**
1. Create account at [GatewayAPI.com](https://gatewayapi.com)
2. Generate API key in dashboard
3. Configure webhook URL: `https://your-api-domain/api/v1/webhooks/gatewayapi`

### Email Provider (SendGrid)

Required for sending email notifications.

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=EasyRate
SENDGRID_WEBHOOK_VERIFICATION_KEY=MFkwEwYH...  # Optional, for delivery status
```

**Setup Steps:**
1. Create account at [SendGrid.com](https://sendgrid.com)
2. Create API key with Mail Send permissions
3. Verify sender email domain
4. Configure webhook URL: `https://your-api-domain/api/v1/webhooks/sendgrid`

### AWS S3 (File Storage)

Required for photo uploads in reviews.

```bash
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=easyrate-uploads-eu
S3_UPLOAD_URL_EXPIRY=300      # 5 minutes
S3_DOWNLOAD_URL_EXPIRY=3600   # 1 hour
```

**Setup Steps:**
1. Create S3 bucket in eu-central-1 (Frankfurt) for GDPR compliance
2. Create IAM user with S3 access
3. Configure bucket CORS policy:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### AI Providers (Optional)

For AI-powered insights and response generation. Configure at least one:

```bash
# Primary: Grok (xAI)
GROK_API_KEY=xai-xxxxxxxxxxxxx
GROK_MODEL=grok-beta

# Fallback: OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo
```

### Google Business Profile (Optional)

For syncing Google reviews.

```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/google/auth/callback
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "My Business Account Management API" and "My Business Business Information API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI
6. Request verification for `business.manage` scope (production only)

### Error Monitoring (Optional)

```bash
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Review Token Security

```bash
REVIEW_TOKEN_SECRET=your-review-token-secret-min-32-chars
REVIEW_TOKEN_EXPIRES_IN=60d
```

---

## Database Setup

### Local Development

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Docker:**
```bash
docker run -d \
  --name easyrate-mongo \
  -p 27017:27017 \
  -v easyrate-mongo-data:/data/db \
  mongo:7
```

**Verify Connection:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

### Production (MongoDB Atlas)

1. Create cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Choose M10+ tier for production workloads
3. Select region closest to your servers (eu-central-1 recommended)
4. Create database user with readWrite permissions
5. Whitelist your server IPs or use 0.0.0.0/0 with VPC peering
6. Get connection string:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/easyrate?retryWrites=true&w=majority
```

### Database Schema

Indexes are automatically created on first connection. Key collections:

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| `businesses` | Tenant accounts | `email` (unique) |
| `users` | User accounts | `email` (unique), `businessId` |
| `reviews` | Customer feedback | `businessId + createdAt`, `businessId + rating` |
| `notifications` | SMS/email tracking | `businessId + status`, `externalMessageId` |
| `orderqueues` | Order processing queue | `status + scheduledFor` (unique compound) |
| `externalreviews` | Google reviews | `businessId + sourcePlatform + externalId` (unique) |
| `insightruns` | AI analysis results | `businessId + createdAt` |

### Multi-Tenancy

All queries are scoped by `businessId` at the service layer. No additional configuration needed.

---

## External Services

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EasyRate System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │───▶│   Backend    │───▶│   MongoDB    │      │
│  │   (Vercel)   │    │  (Railway)   │    │   (Atlas)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Gateway API │    │   SendGrid   │    │    AWS S3    │      │
│  │    (SMS)     │    │   (Email)    │    │  (Storage)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    Grok/     │    │   Google     │    │   Sentry     │      │
│  │   OpenAI     │    │   Business   │    │ (Monitoring) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Service Checklist

| Service | Required | Purpose | Cost |
|---------|----------|---------|------|
| MongoDB | Yes | Database | Free tier available |
| Gateway API | Yes* | SMS delivery | Pay per SMS |
| SendGrid | Yes* | Email delivery | Free tier: 100/day |
| AWS S3 | Yes | Photo storage | ~$0.023/GB |
| Grok/OpenAI | No | AI features | Pay per token |
| Google Business | No | Review sync | Free |
| Sentry | No | Error monitoring | Free tier available |

*At least one messaging provider required

---

## Platform Integrations

### Dully Integration (Takeaway Platform)

Dully sends webhooks when orders are completed.

**Configuration in EasyRate Dashboard:**
1. Go to Settings → Integrations → Dully
2. Copy the webhook URL shown
3. Add to your Dully admin panel

**Webhook URL Format:**
```
POST https://your-api-domain/api/v1/webhooks/dully/{businessId}
```

**Security:**
- Configure `DULLY_WEBHOOK_SECRET` for HMAC-SHA256 signature verification
- Webhook payloads are validated with 5-minute timestamp tolerance

**Trigger Events:**
- `order.picked_up` - Order collected by customer
- `order.approved` - Order approved for processing

**Delay:** Review request sent 60 minutes after order completion

### EasyTable Integration (Restaurant Booking)

EasyTable uses REST API polling for completed bookings.

**Configuration in EasyRate Dashboard:**
1. Go to Settings → Integrations → EasyTable
2. Enter your API Key and Place Token
3. Test the connection

**Required Credentials:**
- API Key (from EasyTable admin)
- Place Token (location-specific)

**Polling Behavior:**
- Fetches completed bookings where guest has arrived
- Respects rate limits (3 requests/second)
- Tracks last sync timestamp to avoid duplicates

**Delay:** Review request sent 120 minutes after booking completion

---

## Development Setup

### 1. Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd easyrate_review

# Install all dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy template
cp apps/backend/.env.example apps/backend/.env

# Edit with your values
nano apps/backend/.env
```

**Minimum for development:**
```bash
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/easyrate
JWT_SECRET=development-secret-change-in-production
FRONTEND_URL=http://localhost:3000
```

### 3. Start Services

```bash
# Start MongoDB (if not running)
brew services start mongodb-community

# Start all services in dev mode
pnpm dev
```

This starts:
- Frontend: http://localhost:3000 (Vite dev server with HMR)
- Backend: http://localhost:3001 (Express with tsx watch)

### 4. Verify Setup

```bash
# Check backend health
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "version": "0.0.1",
  "database": "connected"
}
```

### Available Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages for production |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |

---

## Production Deployment

### Architecture Overview

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | app.easyrate.app |
| Backend | Railway | api.easyrate.app |
| Database | MongoDB Atlas | cluster.mongodb.net |
| Storage | AWS S3 | s3.eu-central-1.amazonaws.com |

### Frontend Deployment (Vercel)

**Automatic Deployment:**
- Pushes to `main` branch trigger automatic deployment
- PR previews are generated automatically

**Manual Deployment:**
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/frontend
vercel --prod
```

**Configuration (`apps/frontend/vercel.json`):**
- SPA routing enabled (all routes → index.html)
- Security headers configured
- Build command uses monorepo filter

### Backend Deployment (Railway)

**Automatic Deployment:**
- Pushes to `main` branch trigger automatic deployment
- Health checks verify deployment success

**Manual Deployment:**
```bash
# Install Railway CLI
brew install railway

# Login and deploy
railway login
railway up --service backend
```

**Configuration (`apps/backend/railway.toml`):**
- NIXPACKS builder auto-detects Node.js
- Health check endpoint: `/health`
- Auto-restart on failure (max 10 retries)

### Environment Variables (Production)

Set these in your deployment platform:

**Vercel (Frontend):**
- No environment variables needed (uses API proxy)

**Railway (Backend):**
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<secure-random-string>
FRONTEND_URL=https://app.easyrate.app
GATEWAYAPI_API_KEY=<your-key>
SENDGRID_API_KEY=<your-key>
SENDGRID_FROM_EMAIL=noreply@easyrate.app
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=easyrate-uploads-prod
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_REDIRECT_URI=https://api.easyrate.app/api/v1/google/auth/callback
SENTRY_DSN=<your-dsn>
```

### DNS Configuration

| Domain | Type | Target |
|--------|------|--------|
| app.easyrate.app | CNAME | cname.vercel-dns.com |
| api.easyrate.app | CNAME | <railway-domain> |

---

## CI/CD Pipeline

### GitHub Actions Workflows

**Main CI (`/.github/workflows/ci.yml`):**

```
Push to main
    │
    ├── Lint (ESLint + Prettier)
    ├── Type Check (TypeScript)
    ├── Test (Vitest)
    └── Build (Turborepo)
           │
           ▼
    All Pass?
    ├── Yes → Deploy Backend (Railway)
    │       → Deploy Frontend (Vercel)
    └── No  → Fail with notifications
```

**PR Preview (`/.github/workflows/preview.yml`):**
- Triggers on pull requests
- Deploys frontend preview to Vercel
- Comments preview URL on PR

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `RAILWAY_TOKEN` | Railway deployment authentication |
| `VERCEL_TOKEN` | Vercel deployment authentication |
| `VERCEL_ORG_ID` | Vercel organization identifier |
| `VERCEL_PROJECT_ID` | Vercel project identifier |

### Setting Up CI/CD

1. **Railway Token:**
   ```bash
   railway login
   railway whoami  # Get token from ~/.railway/config.json
   ```

2. **Vercel Tokens:**
   ```bash
   vercel login
   vercel link  # Links project and shows IDs
   # Get token from: https://vercel.com/account/tokens
   ```

3. **Add to GitHub:**
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add each secret

---

## Verification & Health Checks

### Backend Health Endpoint

```bash
curl https://api.easyrate.app/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Service Status Checks

```bash
# MongoDB connection
mongosh "mongodb+srv://..." --eval "db.adminCommand('ping')"

# S3 bucket access
aws s3 ls s3://easyrate-uploads-prod --region eu-central-1

# SendGrid API
curl -X GET "https://api.sendgrid.com/v3/user/profile" \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Gateway API
curl -X GET "https://gatewayapi.com/rest/me" \
  -H "Authorization: Basic $(echo -n $GATEWAYAPI_API_KEY: | base64)"
```

### Monitoring Checklist

- [ ] Health endpoint returns 200
- [ ] Database connection is "connected"
- [ ] No errors in Sentry dashboard
- [ ] SMS/Email delivery rates are normal
- [ ] S3 uploads are working
- [ ] Order queue is processing

---

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```
Error: MongoServerSelectionError
```
- Check `MONGODB_URI` is correct
- Verify IP whitelist in MongoDB Atlas
- Ensure MongoDB service is running locally

**SMS Not Sending:**
- Verify `GATEWAYAPI_API_KEY` is valid
- Check phone number format (include country code: +45...)
- Review Gateway API dashboard for errors

**Email Not Sending:**
- Verify `SENDGRID_API_KEY` has Mail Send permission
- Check sender email is verified
- Review SendGrid Activity Feed for bounces

**S3 Upload Failed:**
```
Error: AccessDenied
```
- Verify IAM credentials have S3 access
- Check bucket CORS configuration
- Ensure bucket region matches `AWS_REGION`

**Google OAuth Error:**
- Verify redirect URI matches exactly
- Check API is enabled in Google Cloud Console
- Ensure OAuth consent screen is configured

### Debug Mode

Enable verbose logging:
```bash
DEBUG=easyrate:* pnpm dev
```

### Getting Help

1. Check existing [GitHub Issues](https://github.com/your-repo/issues)
2. Review error logs in Sentry
3. Check service-specific dashboards (SendGrid, Gateway API, etc.)

---

## Security Checklist

Before going to production:

- [ ] Change all default secrets (`JWT_SECRET`, `REVIEW_TOKEN_SECRET`)
- [ ] Use strong, unique passwords for database
- [ ] Enable MongoDB authentication
- [ ] Configure S3 bucket policies (no public access)
- [ ] Set up HTTPS for all endpoints
- [ ] Configure CORS to only allow your domains
- [ ] Enable rate limiting (already configured in backend)
- [ ] Set up Sentry for error monitoring
- [ ] Review webhook secrets for all integrations
- [ ] Test GDPR data export and deletion flows

---

## Additional Resources

- [CLAUDE.md](./CLAUDE.md) - Development guidelines and project overview
- [API Documentation](./docs/api.md) - REST API reference
- [Runbook](./docs/runbook.md) - Operations procedures
- [Gateway API Docs](https://gatewayapi.com/docs/)
- [SendGrid Docs](https://docs.sendgrid.com/)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
