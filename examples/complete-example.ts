/**
 * Complete example demonstrating all features of @kxtech/email-utils
 */

import 'dotenv/config'; // Load environment variables from .env file

import {
  createEmailService,
  EmailService,
  createTemplate,
  generateInviteToken,
  validateInviteToken,
} from '@toldyaonce/kx-email-utils';

// Configuration from environment variables
const emailConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  defaultFrom: process.env.EMAIL_DEFAULT_FROM || 'noreply@kxtech.io',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  defaultTokenExpiry: process.env.TOKEN_EXPIRY || '24h',
  devMode: process.env.NODE_ENV === 'development', // Skip actual AWS calls in dev
  bounceTableName: process.env.BOUNCE_TABLE_NAME, // Optional - for bounce tracking
  bulkQueueUrl: process.env.BULK_QUEUE_URL, // Optional - for bulk processing
};

async function main(): Promise<void> {
  console.log('🚀 Starting @kxtech/email-utils complete example\n');

  // Initialize the email service
  const emailService = createEmailService(emailConfig);
  
  // Add basic templates since default loading is disabled
  const inviteTemplate = createTemplate({
    subject: 'You\'re invited to join {{companyName}}!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to {{companyName}}!</h1>
        <p>Hi {{name}},</p>
        <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{companyName}}</strong> as a <strong>{{role}}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{inviteUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
        </div>
        <p>If the button doesn't work, copy this link: {{inviteUrl}}</p>
        <p>Best regards,<br>The {{companyName}} Team</p>
      </div>
    `,
    text: `
Welcome to {{companyName}}!

Hi {{name}},

{{inviterName}} has invited you to join {{companyName}} as a {{role}}.

Accept your invitation: {{inviteUrl}}

Best regards,
The {{companyName}} Team
    `,
  });

  const resetTemplate = createTemplate({
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Reset Your Password</h1>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
        </div>
        <p>This link expires in {{expiresIn}}.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `
Reset Your Password

Hi {{name}},

We received a request to reset your password.

Reset link: {{resetUrl}}

This link expires in {{expiresIn}}.

If you didn't request this, please ignore this email.
    `,
  });

  // Register the templates
  emailService.setTemplates({
    invite: { en: inviteTemplate },
    resetPassword: { en: resetTemplate },
  });
  
  console.log('✅ Templates loaded successfully');

  // Example 1: Send invite email
  console.log('📧 Example 1: Sending invite email');
  try {
    if(!process.env.EMAIL_TO) {
      throw new Error('EMAIL_TO is not set');
    }
    const inviteResult = await emailService.sendInviteEmail({
      email: process.env.EMAIL_TO,
      name: process.env.NAME || 'David Glass',
      companyName: process.env.COMPANY_NAME || 'KX Tech',
      companyId: process.env.COMPANY_ID || 'kx-tech-001',
      inviterName: 'David Glass',
      role: 'Senior Developer',
      message: 'We are excited to have you join our engineering team!',
    }, {
      locale: 'en',
      campaign: 'q4-hiring',
    });

    console.log('✅ Invite email result:', inviteResult);
  } catch (error) {
    console.error('❌ Failed to send invite email:', error);
  }
  return;
  // Example 2: Send password reset email in Spanish
  console.log('\n📧 Example 2: Sending password reset email (Spanish)');
  try {
    const resetResult = await emailService.sendResetPasswordEmail({
      email: process.env.EMAIL_TO || 'maria.garcia@example.com',
      name: process.env.NAME || 'María García',
      resetUrl: process.env.RESET_URL || 'https://app.kxtech.io/reset-password',
      expiresIn: '2 horas',
    }, {
      locale: 'es',
      campaign: 'password-security',
    });

    console.log('✅ Reset email result:', resetResult);
  } catch (error) {
    console.error('❌ Failed to send reset email:', error);
  }

  // Example 3: Token management
  console.log('\n🔐 Example 3: Token management');
  try {
    // Generate tokens
    const inviteToken = generateInviteToken(emailConfig, {
      email: process.env.EMAIL_TO || 'developer@example.com',
      companyId: process.env.COMPANY_ID || 'kx-tech-001',
      role: process.env.ROLE || 'Full Stack Developer',
    }, '48h');

    console.log('🎫 Generated invite token:', inviteToken);

    // Validate token
    const tokenData = validateInviteToken(emailConfig, inviteToken);
    console.log('✅ Token validation successful:', tokenData);

    // Get token expiration
    const tokenService = emailService.getTokenService();
    const expiration = tokenService.getTokenExpiration(inviteToken);
    console.log('⏰ Token expires at:', expiration);

  } catch (error) {
    console.error('❌ Token operation failed:', error);
  }

  // Example 4: Custom templates
  console.log('\n🎨 Example 4: Custom template creation');
  try {
    // Create a custom welcome template
    const welcomeTemplate = createTemplate({
      subject: 'Welcome to {{companyName}} - Your {{role}} Journey Begins!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
                .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to {{companyName}}!</h1>
                    <p>Your journey as a {{role}} starts here</p>
                </div>
                <div class="content">
                    <p>Hi {{name}},</p>
                    
                    <p>Welcome to {{companyName}}! We're thrilled to have you join our team as a <strong>{{role}}</strong>.</p>
                    
                    <div class="stats">
                        <div class="stat">
                            <h3>{{teamSize}}+</h3>
                            <p>Team Members</p>
                        </div>
                        <div class="stat">
                            <h3>{{projectsCount}}</h3>
                            <p>Active Projects</p>
                        </div>
                        <div class="stat">
                            <h3>{{yearsActive}}</h3>
                            <p>Years of Innovation</p>
                        </div>
                    </div>
                    
                    <p>Your assigned mentor, <strong>{{mentorName}}</strong>, will reach out to you shortly to help you get started.</p>
                    
                    <a href="{{dashboardUrl}}" class="button">Access Your Dashboard</a>
                    
                    <p>Best regards,<br>
                    The {{companyName}} Team</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
Welcome to {{companyName}}!

Hi {{name}},

Welcome to {{companyName}}! We're thrilled to have you join our team as a {{role}}.

Company Stats:
- Team Members: {{teamSize}}+
- Active Projects: {{projectsCount}}
- Years of Innovation: {{yearsActive}}

Your assigned mentor, {{mentorName}}, will reach out to you shortly.

Access your dashboard: {{dashboardUrl}}

Best regards,
The {{companyName}} Team
      `,
      defaults: {
        companyName: 'KX Technology',
        teamSize: '50',
        projectsCount: '12',
        yearsActive: '5',
      },
    }, 'en');

    // Register the custom template
    emailService.setTemplates({
      welcome: {
        en: welcomeTemplate,
      },
    });

    // Test template rendering
    const content = await emailService.getTemplateRegistry().renderTemplate('welcome', {
      name: 'Alex Johnson',
      role: 'DevOps Engineer',
      mentorName: 'Sarah Wilson',
      dashboardUrl: 'https://app.kxtech.io/dashboard',
    });

    console.log('✅ Custom template rendered successfully');
    console.log('📧 Subject:', content.subject);
    console.log('📄 Text preview:', content.text.substring(0, 100) + '...');

  } catch (error) {
    console.error('❌ Custom template creation failed:', error);
  }

  // Example 5: Bulk email sending
  console.log('\n📬 Example 5: Bulk email sending');
  try {
    const recipients = [
      { email: 'user1@example.com', name: 'Alice Smith', personalizedData: { department: 'Engineering' } },
      // { email: 'user2@example.com', name: 'Bob Johnson', personalizedData: { department: 'Design' } },
      // { email: 'user3@example.com', name: 'Carol Davis', personalizedData: { department: 'Marketing' } },
    ];

    const bulkResult = await emailService.sendAdvancedBulkEmail(
      recipients,
      'invite', // Use built-in invite template
      {
        companyName: 'KX Technology',
        companyId: 'kx-tech-001',
        inviterName: 'HR Team',
        role: 'Team Member',
        inviteUrl: 'https://app.kxtech.io/join',
      },
      {
        locale: 'en',
        campaign: 'company-wide-announcement',
        type: 'bulk',
        queue: false, // Process immediately for this small batch
      }
    );

    console.log('✅ Bulk email result:', bulkResult);
    console.log(`📊 Success: ${bulkResult.successCount}/${bulkResult.totalRecipients}`);

  } catch (error) {
    console.error('❌ Bulk email sending failed:', error);
  }

  // Example 6: Bounce tracking (if configured)
  console.log('\n🚫 Example 6: Bounce tracking');
  try {
    const testEmail = 'bounce-test@example.com';
    
    // Check if email has bounced
    const hasBounced = await emailService.hasEmailBounced(testEmail);
    console.log(`📧 ${testEmail} has bounced:`, hasBounced);

    // Get bounce statistics
    const stats = await emailService.getBounceStats();
    console.log('📊 Bounce statistics:', stats);

  } catch (error) {
    console.error('❌ Bounce tracking failed:', error);
  }

  // Example 7: SES quota monitoring
  console.log('\n📈 Example 7: SES quota monitoring');
  try {
    const quota = await emailService.getSendingQuota();
    console.log('📊 SES Sending Quota:', quota);
    
    const utilizationPercent = (quota.sentLast24Hours / quota.max24HourSend) * 100;
    console.log(`📈 24h Utilization: ${utilizationPercent.toFixed(1)}%`);

    if (utilizationPercent > 80) {
      console.log('⚠️  Warning: High email volume detected');
    }

  } catch (error) {
    console.error('❌ Quota check failed:', error);
  }

  // Example 8: Bulk email estimation
  console.log('\n⏱️  Example 8: Bulk email time estimation');
  try {
    const scenarios = [100, 1000, 10000, 50000];
    
    scenarios.forEach(count => {
      const estimate = emailService.estimateBulkSendingTime(count);
      console.log(`📧 ${count.toLocaleString()} emails:`);
      console.log(`   ⏰ Estimated time: ${estimate.estimatedMinutes} minutes`);
      console.log(`   📦 Batches: ${estimate.estimatedBatches}`);
      console.log(`   💡 Strategy: ${estimate.recommendedStrategy}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Estimation failed:', error);
  }

  console.log('🎉 Complete example finished successfully!');
}

// Advanced usage examples
export class AdvancedEmailService {
  private emailService: EmailService;

  constructor(config: any) {
    this.emailService = createEmailService(config);
  }

  /**
   * Send onboarding sequence emails
   */
  async sendOnboardingSequence(user: {
    email: string;
    name: string;
    role: string;
    startDate: Date;
  }): Promise<void> {
    const baseData = {
      name: user.name,
      role: user.role,
      companyName: 'KX Technology',
      startDate: user.startDate.toLocaleDateString(),
    };

    // Day 0: Welcome email
    await this.emailService.sendInviteEmail({
      email: user.email,
      name: user.name,
      companyName: 'KX Technology',
      companyId: 'kx-tech',
      inviterName: 'HR Team',
      role: user.role,
    }, {
      campaign: 'onboarding-day-0',
      subject: `Welcome to KX Technology, ${user.name}!`,
    });

    console.log(`📧 Onboarding sequence started for ${user.email}`);
  }

  /**
   * Send templated notification with retry logic
   */
  async sendNotificationWithRetry(
    templateType: string,
    recipient: string,
    data: any,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const content = await this.emailService.getTemplateRegistry()
          .renderTemplate(templateType, data);

        const result = await this.emailService.sendEmail({
          from: emailConfig.defaultFrom,
          to: recipient,
          content,
          metadata: {
            type: 'notification',
            campaign: `${templateType}-notification`,
          },
        });

        if (result.success) {
          console.log(`✅ Notification sent successfully on attempt ${attempt}`);
          return true;
        } else {
          throw new Error(result.error || 'Send failed');
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error(`🚫 All ${maxRetries} attempts failed for ${recipient}`);
          return false;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  /**
   * Batch process invitations with error handling
   */
  async batchProcessInvitations(invitations: Array<{
    email: string;
    name: string;
    role: string;
    companyId: string;
  }>): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Process in chunks to avoid overwhelming SES
    const chunkSize = 10;
    for (let i = 0; i < invitations.length; i += chunkSize) {
      const chunk = invitations.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (invitation) => {
        try {
          const result = await this.emailService.sendInviteEmail({
            email: invitation.email,
            name: invitation.name,
            companyName: 'KX Technology',
            companyId: invitation.companyId,
            inviterName: 'Hiring Team',
            role: invitation.role,
          });

          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              email: invitation.email,
              error: result.error || 'Unknown error',
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            email: invitation.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(chunkPromises);

      // Rate limiting - wait between chunks
      if (i + chunkSize < invitations.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}