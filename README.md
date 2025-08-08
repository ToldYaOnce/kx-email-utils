# @kxtech/email-utils

A comprehensive, reusable TypeScript NPM package for sending transactional and bulk HTML emails using AWS SES. Built for multi-project reuse with full support for pluggable templates, token-based invite flows, multi-language i18n, and CDK infrastructure.

## Features

### ✅ Core Features
- **AWS SES Integration** - Direct AWS SDK integration (no Amplify)
- **Pluggable Templates** - Mustache-based templates with i18n support
- **Token-based Invites** - JWT token generation and validation
- **Multi-language Support** - Built-in English and Spanish templates
- **CDK Infrastructure** - Complete AWS infrastructure as code
- **Bounce/Complaint Handling** - SNS + DynamoDB bounce tracking
- **Email Preview Server** - Express-based development preview
- **Future-proof Bulk Architecture** - SQS-based bulk email processing

### 🚀 Production Ready
- TypeScript with strict typing
- Comprehensive test coverage
- ESLint code quality
- Modular, extensible architecture
- DynamoDB bounce suppression
- Rate limiting and quota management

## Quick Start

### Installation

```bash
npm install @kxtech/email-utils
```

### Basic Usage

```typescript
import { createEmailService } from '@kxtech/email-utils';

const emailService = createEmailService({
  region: 'us-east-1',
  defaultFrom: 'noreply@yourcompany.com',
  jwtSecret: 'your-jwt-secret',
  defaultTokenExpiry: '24h',
});

// Send an invite email
await emailService.sendInviteEmail({
  email: 'user@example.com',
  name: 'John Doe',
  companyName: 'Acme Corp',
  companyId: 'acme-123',
  inviterName: 'Jane Smith',
  role: 'Developer',
});

// Send a password reset email
await emailService.sendResetPasswordEmail({
  email: 'user@example.com',
  name: 'John Doe',
  resetUrl: 'https://app.example.com/reset',
});
```

## Infrastructure Setup

### 1. Deploy AWS Infrastructure

```bash
# Install CDK dependencies
npm install -g aws-cdk

# Configure your environment
export EMAIL_DOMAIN="email.yourcompany.com"
export SENDER_EMAIL="noreply@yourcompany.com"
export ENVIRONMENT="production"

# Deploy the infrastructure
cdk deploy EmailInfrastructure-production
```

### 2. Configure DNS

After deployment, add the DKIM TXT records shown in the CDK output to your domain's DNS settings.

### 3. Verify Domain and Email

1. Go to AWS SES Console
2. Verify your domain: `email.yourcompany.com`
3. Verify your sender email: `noreply@yourcompany.com`
4. Move out of SES sandbox for production use

## API Reference

### EmailService

The main service class that orchestrates all email functionality.

```typescript
import { EmailService } from '@kxtech/email-utils';

const service = new EmailService({
  region: 'us-east-1',
  defaultFrom: 'noreply@example.com',
  jwtSecret: 'your-secret',
  defaultTokenExpiry: '24h',
  bounceTableName: 'email-bounces', // Optional
  bulkQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/bulk-email', // Optional
});
```

#### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `region` | string | Yes | AWS region for SES |
| `defaultFrom` | string | Yes | Default sender email |
| `jwtSecret` | string | Yes | JWT signing secret |
| `defaultTokenExpiry` | string | Yes | Default token expiration (e.g., '24h') |
| `bounceTableName` | string | No | DynamoDB table for bounce tracking |
| `bulkQueueUrl` | string | No | SQS queue URL for bulk processing |
| `devMode` | boolean | No | Enable development mode (no actual sends) |
| `templates` | object | No | Custom template overrides |

### Email Functions

#### sendInviteEmail()

Send invitation emails with company and role information.

```typescript
const result = await emailService.sendInviteEmail({
  email: 'user@example.com',
  name: 'John Doe', // Optional
  companyName: 'Acme Corp',
  companyId: 'acme-123',
  inviterName: 'Jane Smith',
  role: 'Software Engineer',
  message: 'Welcome to our team!', // Optional
  inviteUrl: 'https://app.example.com/invite?token=...', // Auto-generated if not provided
}, {
  locale: 'en', // Optional: 'en', 'es', etc.
  subject: 'Custom Subject', // Optional override
  from: 'custom@example.com', // Optional override
  campaign: 'q4-hiring', // Optional campaign tracking
});
```

#### sendResetPasswordEmail()

Send password reset emails with secure tokens.

```typescript
const result = await emailService.sendResetPasswordEmail({
  email: 'user@example.com',
  name: 'John Doe', // Optional
  resetUrl: 'https://app.example.com/reset', // Token will be added automatically
  expiresIn: '1 hour', // Optional, defaults to '24 hours'
}, {
  locale: 'es', // Optional
  subject: 'Restablece tu contraseña', // Optional override
});
```

### Token Management

#### Generate Tokens

```typescript
// Generate invite token
const inviteToken = emailService.generateInviteToken({
  email: 'user@example.com',
  companyId: 'acme-123',
  role: 'developer',
}, '48h'); // Optional custom expiry

// Generate reset token
const resetToken = emailService.generateResetToken({
  email: 'user@example.com',
}, '1h');
```

#### Validate Tokens

```typescript
try {
  const inviteData = emailService.validateInviteToken(token);
  console.log(inviteData.email, inviteData.companyId, inviteData.role);
} catch (error) {
  console.error('Invalid or expired token:', error.message);
}

try {
  const resetData = emailService.validateResetToken(token);
  console.log('Reset requested for:', resetData.email);
} catch (error) {
  console.error('Invalid or expired reset token:', error.message);
}
```

### Template System

#### Default Templates

The package includes professional templates for:
- **Invite emails** (English & Spanish)
- **Password reset emails** (English & Spanish)

#### Custom Templates

```typescript
import { createTemplate } from '@kxtech/email-utils';

const customTemplate = createTemplate({
  subject: 'Welcome to {{companyName}}',
  html: `
    <h1>Welcome {{name}}!</h1>
    <p>You've joined {{companyName}} as a {{role}}.</p>
    <a href="{{actionUrl}}">Get Started</a>
  `,
  text: `
    Welcome {{name}}!
    You've joined {{companyName}} as a {{role}}.
    Get started: {{actionUrl}}
  `,
}, 'en');

// Register the custom template
emailService.setTemplates({
  welcome: {
    en: customTemplate,
  },
});
```

#### Template Rendering

```typescript
const content = await emailService.getTemplateRegistry().renderTemplate(
  'invite',
  {
    name: 'John',
    companyName: 'Acme Corp',
    role: 'Developer',
    inviteUrl: 'https://...',
  },
  'en'
);

console.log(content.subject); // Rendered subject
console.log(content.html);    // Rendered HTML
console.log(content.text);    // Rendered plain text
```

### Bulk Email

#### Send Bulk Emails

```typescript
// Simple bulk send
const result = await emailService.sendBulkEmail(
  ['user1@example.com', 'user2@example.com', 'user3@example.com'],
  {
    from: 'newsletter@example.com',
    content: {
      subject: 'Monthly Newsletter',
      html: '<h1>Newsletter</h1><p>This month...</p>',
      text: 'Newsletter\nThis month...',
    },
  },
  {
    campaign: 'monthly-newsletter',
    queue: true, // Force queueing for large batches
  }
);

// Advanced bulk send with personalization
const result = await emailService.sendAdvancedBulkEmail(
  [
    { 
      email: 'user1@example.com', 
      name: 'John',
      personalizedData: { role: 'Admin' }
    },
    { 
      email: 'user2@example.com', 
      name: 'Jane',
      personalizedData: { role: 'User' }
    },
  ],
  'welcome', // Template type
  {
    companyName: 'Acme Corp',
  }, // Base template data
  {
    locale: 'en',
    campaign: 'user-onboarding',
  }
);
```

#### Estimate Sending Time

```typescript
const estimate = emailService.estimateBulkSendingTime(10000);
console.log(`Estimated time: ${estimate.estimatedMinutes} minutes`);
console.log(`Recommended strategy: ${estimate.recommendedStrategy}`);
```

### Bounce Tracking

#### Check Bounce Status

```typescript
// Check if an email has bounced
const hasBounced = await emailService.hasEmailBounced('user@example.com');

// Get detailed bounce information
const bounceInfo = await emailService.getBounceInfo('user@example.com');

// Get bounce statistics
const stats = await emailService.getBounceStats();
console.log(`Total bounces: ${stats.totalBounces}`);
console.log(`Hard bounces: ${stats.hardBounces}`);
console.log(`Complaints: ${stats.complaints}`);
```

## Email Preview Server

Start the development preview server to test templates:

```bash
npm run preview
```

Visit `http://localhost:3000` to:
- Preview all available templates
- Test with custom data
- Switch between locales
- View both HTML and plain text versions

### Preview API

```bash
# Preview invite email
curl "http://localhost:3000/preview/invite?locale=en&name=John&companyName=Acme"

# Preview reset email
curl "http://localhost:3000/preview/reset-password?locale=es&name=Maria"

# Get plain text version
curl "http://localhost:3000/preview/invite/text?locale=en"

# Get available templates
curl "http://localhost:3000/api/templates"
```

## CDK Infrastructure

The package includes a complete CDK stack for AWS infrastructure:

### Stack Components

- **SES Configuration** - Domain and email verification
- **IAM Roles** - Proper permissions for Lambda functions
- **DynamoDB Table** - Bounce tracking storage
- **SNS Topics** - Bounce/complaint notifications
- **SQS Queues** - Bulk email processing
- **Lambda Functions** - Bounce handler and bulk processor

### Deployment

```bash
# Install dependencies
npm install

# Deploy with custom configuration
cdk deploy EmailInfrastructure-production \
  --context emailDomain=email.yourcompany.com \
  --context senderEmail=noreply@yourcompany.com \
  --context environment=production
```

### Stack Outputs

After deployment, you'll receive:
- Configuration Set Name
- IAM Role ARN
- DynamoDB Table Name
- SQS Queue URL
- DKIM DNS records to configure

## Development

### Setup

```bash
git clone <repository>
cd kx-email-utils
npm install
```

### Available Scripts

```bash
npm run build          # Build TypeScript
npm run dev           # Watch mode development
npm run test          # Run tests
npm run test:watch    # Watch mode testing
npm run lint          # Run ESLint
npm run preview       # Start email preview server
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/__tests__/email-service.test.ts
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Security Considerations

### JWT Secrets

- Use strong, unique JWT secrets in production
- Rotate secrets regularly
- Store secrets in AWS Secrets Manager or similar

### SES Permissions

- Use least-privilege IAM policies
- Restrict SES sending to verified domains
- Monitor sending quotas and usage

### Bounce Handling

- Automatically suppress bounced emails
- Monitor complaint rates
- Implement feedback loops

## Troubleshooting

### Common Issues

#### SES Sandbox

**Problem:** Emails only send to verified addresses
**Solution:** Request production access through AWS Support

#### DNS Verification

**Problem:** Domain verification fails
**Solution:** Ensure DKIM records are correctly added to DNS

#### Rate Limiting

**Problem:** SES rate limit exceeded
**Solution:** Implement proper bulk email queueing

#### Token Validation

**Problem:** JWT tokens not validating
**Solution:** Ensure consistent JWT secret across services

### Debug Mode

Enable detailed logging:

```typescript
const emailService = createEmailService({
  // ... config
  devMode: true, // Enables debug logging
});
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](https://github.com/kxtech/email-utils/issues)
- Documentation: [Full API Documentation](https://kxtech.github.io/email-utils)
- Email: support@kxtech.io