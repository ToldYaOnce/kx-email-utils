# Deployment Guide for @kxtech/email-utils

This guide covers deploying the AWS infrastructure and configuring the email service for production use.

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **AWS CDK** installed globally (`npm install -g aws-cdk`)
3. **Domain ownership** for email sending
4. **AWS Account** with SES available in your target region

## Step 1: Initial AWS Setup

### Bootstrap CDK (first time only)

```bash
cdk bootstrap aws://YOUR-ACCOUNT-ID/YOUR-REGION
```

### Verify AWS Permissions

Your AWS user/role needs permissions for:
- SES (Simple Email Service)
- IAM (Identity and Access Management)
- DynamoDB
- SNS (Simple Notification Service)
- SQS (Simple Queue Service)
- Lambda
- CloudFormation

## Step 2: Domain Configuration

### Option A: Using Your Own Domain

1. Own a domain (e.g., `yourcompany.com`)
2. Plan email subdomain (e.g., `email.yourcompany.com`)
3. Have access to DNS management

### Option B: Using SES Domain

1. Use a domain you already verified in SES
2. Or use SES sandbox for testing (limited functionality)

## Step 3: Deploy Infrastructure

### Configure Environment Variables

```bash
# Required
export EMAIL_DOMAIN="email.yourcompany.com"
export SENDER_EMAIL="noreply@yourcompany.com"
export ENVIRONMENT="production"
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"

# Optional
export JWT_SECRET="your-super-secure-jwt-secret"
```

### Deploy the Stack

```bash
# Clone and setup
git clone <your-repo>
cd kx-email-utils
npm install

# Deploy infrastructure
npm run cdk:deploy
```

### Alternative: Deploy with inline context

```bash
cdk deploy EmailInfrastructure-production \
  --context emailDomain=email.yourcompany.com \
  --context senderEmail=noreply@yourcompany.com \
  --context environment=production
```

## Step 4: DNS Configuration

After deployment, you'll receive DNS records to add:

### Example CDK Output:
```
EmailInfrastructure-production.DomainVerificationTxtRecord = 
"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

### Add DNS Records:

1. **DKIM Records** (for email authentication)
   ```
   Type: TXT
   Name: [as provided in CDK output]
   Value: [as provided in CDK output]
   ```

2. **SPF Record** (optional but recommended)
   ```
   Type: TXT
   Name: @
   Value: "v=spf1 include:amazonses.com ~all"
   ```

3. **DMARC Record** (optional but recommended)
   ```
   Type: TXT
   Name: _dmarc
   Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourcompany.com"
   ```

## Step 5: SES Configuration

### Verify Domain in SES Console

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Navigate to "Verified identities"
3. Your domain should appear (added by CDK)
4. Wait for verification status to be "Verified"

### Verify Sender Email

1. In SES Console, add your sender email
2. Check the email inbox for verification email
3. Click verification link

### Request Production Access

If you're in SES Sandbox:

1. Go to SES Console → "Account dashboard"
2. Click "Request production access"
3. Fill out the form explaining your use case
4. Wait for AWS approval (usually 24-48 hours)

## Step 6: Application Configuration

### Environment Variables for Your App

```bash
# Required
EMAIL_REGION=us-east-1
EMAIL_DEFAULT_FROM=noreply@yourcompany.com
EMAIL_JWT_SECRET=your-super-secure-jwt-secret
EMAIL_DEFAULT_TOKEN_EXPIRY=24h

# Optional (from CDK outputs)
EMAIL_BOUNCE_TABLE_NAME=production-email-bounces
EMAIL_BULK_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/production-bulk-email
```

### Application Code

```typescript
import { createEmailService } from '@kxtech/email-utils';

const emailService = createEmailService({
  region: process.env.EMAIL_REGION!,
  defaultFrom: process.env.EMAIL_DEFAULT_FROM!,
  jwtSecret: process.env.EMAIL_JWT_SECRET!,
  defaultTokenExpiry: process.env.EMAIL_DEFAULT_TOKEN_EXPIRY!,
  bounceTableName: process.env.EMAIL_BOUNCE_TABLE_NAME,
  bulkQueueUrl: process.env.EMAIL_BULK_QUEUE_URL,
});
```

## Step 7: Testing

### Test Basic Email Sending

```typescript
// Test with a verified email address
const result = await emailService.sendInviteEmail({
  email: 'your-verified-email@yourcompany.com',
  name: 'Test User',
  companyName: 'Your Company',
  companyId: 'test-company',
  inviterName: 'System',
  role: 'Tester',
});

console.log('Test result:', result);
```

### Test Token Generation

```typescript
const token = emailService.generateInviteToken({
  email: 'test@yourcompany.com',
  companyId: 'test-company',
  role: 'user',
});

console.log('Generated token:', token);

const decoded = emailService.validateInviteToken(token);
console.log('Decoded token:', decoded);
```

## Step 8: Monitoring Setup

### CloudWatch Alarms

Add alarms for:
- SES bounce rate > 5%
- SES complaint rate > 0.1%
- DynamoDB throttling
- Lambda errors

### Example CloudWatch Alarm

```typescript
new cloudwatch.Alarm(this, 'HighBounceRate', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/SES',
    metricName: 'Bounce',
    statistic: 'Average',
  }),
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: 'SES bounce rate is too high',
});
```

## Step 9: Security Configuration

### IAM Policies

Ensure Lambda functions have minimal required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@yourcompany.com"
        }
      }
    }
  ]
}
```

### Secrets Management

Store sensitive configuration in AWS Secrets Manager:

```typescript
import { SecretsManager } from 'aws-sdk';

const secrets = new SecretsManager({ region: 'us-east-1' });

const jwtSecret = await secrets.getSecretValue({
  SecretId: 'email-service/jwt-secret'
}).promise();
```

## Step 10: Production Optimization

### Rate Limiting

Configure based on your SES limits:

```typescript
const emailService = createEmailService({
  // ... other config
  bulkQueueUrl: queueUrl, // Enable queuing for large batches
});

// For immediate sends, respect rate limits
const quota = await emailService.getSendingQuota();
console.log(`Can send ${quota.maxSendRate} emails/second`);
```

### Monitoring and Logging

```typescript
// Add comprehensive logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.CloudWatch({
      logGroupName: '/aws/lambda/email-service',
    }),
  ],
});

// Log email sends
const result = await emailService.sendInviteEmail(inviteData);
logger.info('Email sent', {
  recipient: inviteData.email,
  success: result.success,
  messageId: result.messageId,
});
```

## Troubleshooting

### Common Issues

#### 1. Domain Not Verified
```
Error: Email address not verified
Solution: Check DNS records and SES console
```

#### 2. Still in Sandbox
```
Error: Can only send to verified addresses
Solution: Request production access or verify recipient
```

#### 3. Rate Limit Exceeded
```
Error: Sending quota exceeded
Solution: Implement proper rate limiting and queuing
```

#### 4. DKIM Failure
```
Error: DKIM verification failed
Solution: Verify DNS records are correctly added
```

### Debug Commands

```bash
# Check DNS propagation
dig TXT _amazonses.email.yourcompany.com

# Test SES from CLI
aws ses send-email \
  --source noreply@yourcompany.com \
  --destination ToAddresses=test@yourcompany.com \
  --message Subject={Data="Test"},Body={Text={Data="Test"}}

# Check CDK stack status
aws cloudformation describe-stacks \
  --stack-name EmailInfrastructure-production
```

## Rollback Plan

### Emergency Rollback

```bash
# Disable email sending (set to dev mode)
export EMAIL_DEV_MODE=true

# Or destroy stack (nuclear option)
npm run cdk:destroy
```

### Gradual Rollback

1. Update configuration to use old email service
2. Monitor for issues
3. Gradually migrate traffic back
4. Clean up resources when stable

## Maintenance

### Regular Tasks

1. **Monitor bounce rates** (should be < 5%)
2. **Check complaint rates** (should be < 0.1%)
3. **Rotate JWT secrets** (quarterly)
4. **Update DNS records** (as needed)
5. **Review CloudWatch logs** (weekly)

### Updates

```bash
# Update the package
npm update @kxtech/email-utils

# Redeploy infrastructure if needed
npm run cdk:diff
npm run cdk:deploy
```

## Cost Optimization

### SES Costs

- $0.10 per 1,000 emails sent
- $0.12 per 1,000 emails received
- Free tier: 62,000 emails/month (when sent from EC2)

### Additional AWS Costs

- DynamoDB: ~$0.25/million read/write units
- SQS: $0.40/million requests
- Lambda: $0.20/million requests
- SNS: $0.50/million notifications

### Cost Monitoring

Set up billing alerts for unexpected usage:

```bash
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://email-service-budget.json
```

## Support

For deployment issues:
1. Check AWS CloudFormation events
2. Review CloudWatch logs
3. Verify DNS propagation
4. Contact AWS Support if needed
5. Open GitHub issue for package-specific problems