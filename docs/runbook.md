# EasyRate Operations Runbook

## Deployment Procedures

### Backend Deployment (Railway)

1. **Automated Deployment**
   - Push to `main` branch triggers automatic deployment
   - CI/CD pipeline runs lint, typecheck, test, build, then deploy
   - Health check at `/health` verifies deployment success

2. **Manual Deployment**

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Deploy
   railway up --service backend
   ```

3. **Environment Variables**
   Required variables on Railway:
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - JWT signing secret (min 32 chars)
   - `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
   - `INMOBILE_API_KEY` - InMobile API key
   - `SMS_SENDER_ID` - Alphanumeric sender ID (e.g., "EasyRate")
   - `RESEND_API_KEY` - Resend API key
   - `RESEND_FROM_EMAIL` - Sender email address
   - `RESEND_FROM_NAME` - Sender name
   - `AWS_REGION` - AWS region (eu-central-1)
   - `AWS_ACCESS_KEY_ID` - AWS access key
   - `AWS_SECRET_ACCESS_KEY` - AWS secret key
   - `S3_BUCKET_NAME` - S3 bucket for uploads
   - `FRONTEND_URL` - Frontend URL for CORS
   - `SENTRY_DSN` - Sentry error tracking DSN

### Frontend Deployment (Vercel)

1. **Automated Deployment**
   - Push to `main` triggers production deployment
   - Pull requests create preview deployments

2. **Manual Deployment**

   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   - `VITE_API_URL` - Backend API URL

---

## Rollback Procedures

### Backend Rollback (Railway)

```bash
# List recent deployments
railway deployments

# Rollback to previous deployment
railway rollback
```

### Frontend Rollback (Vercel)

```bash
# List deployments
vercel ls

# Promote previous deployment to production
vercel promote <deployment-url>
```

---

## GDPR Data Request Handling

### Data Export Request

1. Receive request from customer (via email or support)
2. Verify customer identity
3. Login to admin dashboard
4. Navigate to Business Settings → GDPR
5. Use "Export Data" function with customer email
6. Download generated JSON file
7. Send to customer within 30 days

**API Method:**

```bash
POST /api/v1/gdpr/export
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

### Data Deletion Request

1. Receive and verify deletion request
2. Login to admin dashboard
3. Navigate to Business Settings → GDPR
4. Use "Delete Data" function with customer email
5. Confirm deletion
6. Notify customer of completion

**API Method:**

```bash
POST /api/v1/gdpr/delete
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

**Note:** Deletion removes:

- All reviews submitted by the customer
- All notification records
- Any uploaded photos

---

## Troubleshooting Guide

### Health Check Failures

**Symptoms:** Health check returns non-200 or "degraded" status

**Check:**

1. Database connection
   ```bash
   curl https://api.easyrate.app/health
   ```
2. If `services.database` is not "connected":
   - Verify `MONGODB_URI` is correct
   - Check MongoDB Atlas status
   - Verify IP whitelist includes Railway IPs

### SMS Not Sending

**Symptoms:** Notifications stuck in "pending" status

**Check:**

1. Verify InMobile API credentials
2. Check SMS provider balance/quota
3. Check notification processor logs:
   ```bash
   railway logs --service backend | grep "notification"
   ```
4. Verify phone number format (+45XXXXXXXX)

### Email Delivery Issues

**Symptoms:** Emails not arriving

**Check:**

1. Verify Resend API key
2. Check Resend dashboard for bounces/failures
3. Verify sending domain is verified (SPF + DKIM)
4. Check spam folders

### High Error Rate

**Symptoms:** Sentry alerts or increased 5xx errors

**Check:**

1. Review Sentry dashboard for error patterns
2. Check recent deployments
3. Review resource utilization on Railway
4. Check MongoDB performance metrics

### Review Submissions Failing

**Symptoms:** Customers report submission errors

**Check:**

1. Verify business exists and is active
2. Check consent checkbox in frontend
3. Review error logs for validation failures
4. Test submission flow manually

---

## Monitoring

### Health Check Monitoring

Configure uptime monitoring service (BetterUptime/UptimeRobot):

- **URL:** `https://api.easyrate.app/health`
- **Method:** GET
- **Expected Status:** 200
- **Check Interval:** 1 minute
- **Alert Channels:** Email, Slack

### Error Monitoring (Sentry)

- **Dashboard:** https://sentry.io/organizations/[org]/projects/easyrate-backend/
- **Alert Rules:**
  - High error rate (>10 errors/minute)
  - New error types
  - Performance regression

### Database Monitoring

- **MongoDB Atlas Dashboard:** Monitor connection pool, query performance
- **Alerts:**
  - Connection count > 80% of limit
  - Slow queries > 100ms
  - Storage > 80% capacity

---

## Maintenance Tasks

### Database Cleanup

Run periodically to remove old completed orders from queue:

```bash
# Via API (requires admin auth)
POST /api/v1/admin/cleanup
{
  "olderThanDays": 30
}
```

### Log Review

Weekly review of:

- Error patterns in Sentry
- Failed notification statistics
- Integration webhook failures

### Security Updates

Monthly:

- Run `pnpm audit` to check for vulnerabilities
- Update dependencies: `pnpm update`
- Review access logs for suspicious activity

---

## Emergency Contacts

- **On-call:** [Configure in your monitoring tool]
- **MongoDB Atlas Support:** https://support.mongodb.com
- **Railway Support:** https://railway.app/help
- **Vercel Support:** https://vercel.com/help
