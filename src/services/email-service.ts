/**
 * Main email service combining SES, templates, and tokens
 */

import { SESEmailService } from './ses';
import { TokenService } from './tokens';
import { BounceTracker } from './bounce-tracker';
import { BulkEmailService } from './bulk-email';
import { TemplateRegistry } from '../templates';
// Templates will be loaded at runtime
import type {
  EmailServiceConfig,
  EmailMessage,
  EmailResult,
  EmailSendOptions,
  InviteEmailInput,
  ResetPasswordInput,
  TemplateCollection,
  BulkEmailResult,
  BulkEmailJob,
} from '../types';

/**
 * Main email service for sending transactional emails
 */
export class EmailService {
  private sesService: SESEmailService;
  private tokenService: TokenService;
  private bounceTracker?: BounceTracker;
  private bulkEmailService?: BulkEmailService;
  private templateRegistry: TemplateRegistry;
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.sesService = new SESEmailService(config);
    this.tokenService = new TokenService(config);
    this.templateRegistry = new TemplateRegistry();
    
    // Initialize bounce tracker if table name is provided
    if (config.bounceTableName) {
      this.bounceTracker = new BounceTracker(config);
    }
    
    // Initialize bulk email service if queue URL is provided
    if (config.bulkQueueUrl) {
      this.bulkEmailService = new BulkEmailService(config);
    }
    
    // Load default templates
    this.loadDefaultTemplates();
    
    // Load custom templates if provided
    if (config.templates) {
      this.templateRegistry.setTemplates(config.templates);
    }
  }

  /**
   * Send a raw email message
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    // Check if recipient has bounced (if bounce tracking is enabled)
    if (this.bounceTracker) {
      const recipients = Array.isArray(message.to) ? 
        message.to.map(r => typeof r === 'string' ? r : r.email) : 
        [typeof message.to === 'string' ? message.to : message.to.email];
      
      for (const recipient of recipients) {
        if (await this.bounceTracker.hasEmailBounced(recipient)) {
          return {
            success: false,
            error: `Email address ${recipient} has bounced previously`,
            recipient,
            timestamp: new Date(),
          };
        }
      }
    }

    return this.sesService.sendEmail(message);
  }

  /**
   * Send an invite email
   */
  async sendInviteEmail(
    input: InviteEmailInput,
    options: EmailSendOptions = {}
  ): Promise<EmailResult> {
    try {
      // Generate invite token if URL not provided
      if (!input.inviteUrl) {
        const token = this.tokenService.generateInviteToken({
          email: input.email,
          companyId: input.companyId,
          role: input.role,
        });
        
        // This would typically be constructed with your app's base URL
        input.inviteUrl = `https://app.example.com/invite?token=${token}`;
      }

      // Get template
      const template = options.template || 
        this.templateRegistry.getTemplate('invite', options.locale);
      
      if (!template) {
        throw new Error(`Invite template not found for locale '${options.locale || 'en'}'`);
      }

      // Render email content
      const content = await template.render(input, options.locale);
      
      // Override subject if provided
      if (options.subject) {
        content.subject = options.subject;
      }

      // Build email message
      const message: EmailMessage = {
        from: options.from || this.config.defaultFrom,
        to: input.email,
        content,
        replyTo: options.replyTo,
        headers: options.headers,
        metadata: {
          type: 'invite',
          campaign: options.campaign,
          locale: options.locale,
        },
      };

      return this.sendEmail(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: input.email,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send a password reset email
   */
  async sendResetPasswordEmail(
    input: ResetPasswordInput,
    options: EmailSendOptions = {}
  ): Promise<EmailResult> {
    try {
      // Generate reset token if URL doesn't contain one
      if (!input.resetUrl.includes('token=')) {
        const token = this.tokenService.generateResetToken({
          email: input.email,
        });
        
        const separator = input.resetUrl.includes('?') ? '&' : '?';
        input.resetUrl = `${input.resetUrl}${separator}token=${token}`;
      }

      // Get template
      const template = options.template || 
        this.templateRegistry.getTemplate('resetPassword', options.locale);
      
      if (!template) {
        throw new Error(`Reset password template not found for locale '${options.locale || 'en'}'`);
      }

      // Render email content
      const content = await template.render(input, options.locale);
      
      // Override subject if provided
      if (options.subject) {
        content.subject = options.subject;
      }

      // Build email message
      const message: EmailMessage = {
        from: options.from || this.config.defaultFrom,
        to: input.email,
        content,
        replyTo: options.replyTo,
        headers: options.headers,
        metadata: {
          type: 'reset-password',
          campaign: options.campaign,
          locale: options.locale,
        },
      };

      return this.sendEmail(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: input.email,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send a templated email with custom data
   */
  async sendTemplatedEmail(
    templateType: string,
    email: string,
    data: Record<string, any>,
    options: EmailSendOptions = {}
  ): Promise<EmailResult> {
    try {
      // Get template
      const template = options.template || 
        this.templateRegistry.getTemplate(templateType, options.locale);
      
      if (!template) {
        throw new Error(`Template '${templateType}' not found for locale '${options.locale || 'en'}'`);
      }

      // Render email content with custom data
      const content = await template.render(data, options.locale);
      
      // Override subject if provided
      if (options.subject) {
        content.subject = options.subject;
      }

      // Build email message
      const message: EmailMessage = {
        from: options.from || this.config.defaultFrom,
        to: email,
        content,
        replyTo: options.replyTo,
        headers: options.headers,
        metadata: {
          type: (templateType as any) || 'custom',
          campaign: options.campaign,
          locale: options.locale,
        },
      };

      return this.sendEmail(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: email,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk emails (future-proofed for scale)
   */
  async sendBulkEmail(
    recipients: string[],
    message: Omit<EmailMessage, 'to'>,
    options: EmailSendOptions = {}
  ): Promise<BulkEmailResult> {
    if (this.bulkEmailService) {
      // Use dedicated bulk email service
      const bulkRecipients = recipients.map(email => ({ email }));
      return this.bulkEmailService.sendBulkEmails(
        bulkRecipients,
        message.content,
        {
          from: message.from,
          replyTo: message.replyTo,
          campaign: options.campaign,
          type: options.type,
          forceQueue: options.queue,
        }
      );
    }

    // Fallback to SES service for direct processing
    const jobId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const bulkMessage: EmailMessage = {
      ...message,
      to: recipients,
    };

    const results = await this.sesService.sendBulkEmail(bulkMessage);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    return {
      jobId,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      results,
      status: failureCount === 0 ? 'completed' : failureCount === results.length ? 'failed' : 'partial',
    };
  }

  /**
   * Set custom templates
   */
  setTemplates(templates: Partial<TemplateCollection>): void {
    this.templateRegistry.setTemplates(templates);
  }

  /**
   * Get template registry for advanced template management
   */
  getTemplateRegistry(): TemplateRegistry {
    return this.templateRegistry;
  }

  /**
   * Get token service for token operations
   */
  getTokenService(): TokenService {
    return this.tokenService;
  }

  /**
   * Generate invite token (utility method)
   */
  generateInviteToken(
    payload: { email: string; companyId: string; role: string },
    expiresIn?: string
  ): string {
    return this.tokenService.generateInviteToken(payload, expiresIn);
  }

  /**
   * Validate invite token (utility method)
   */
  validateInviteToken(token: string) {
    return this.tokenService.validateInviteToken(token);
  }

  /**
   * Generate reset token (utility method)
   */
  generateResetToken(
    payload: { email: string },
    expiresIn?: string
  ): string {
    return this.tokenService.generateResetToken(payload, expiresIn);
  }

  /**
   * Validate reset token (utility method)
   */
  validateResetToken(token: string) {
    return this.tokenService.validateResetToken(token);
  }

  /**
   * Get SES sending quota
   */
  async getSendingQuota() {
    return this.sesService.getSendingQuota();
  }

  /**
   * Get bounce tracker service (if enabled)
   */
  getBounceTracker(): BounceTracker | undefined {
    return this.bounceTracker;
  }

  /**
   * Check if an email has bounced
   */
  async hasEmailBounced(email: string): Promise<boolean> {
    if (!this.bounceTracker) {
      return false;
    }
    return this.bounceTracker.hasEmailBounced(email);
  }

  /**
   * Get bounce information for an email
   */
  async getBounceInfo(email: string) {
    if (!this.bounceTracker) {
      return [];
    }
    return this.bounceTracker.getBounceInfo(email);
  }

  /**
   * Get bounce statistics
   */
  async getBounceStats(startDate?: Date, endDate?: Date) {
    if (!this.bounceTracker) {
      return {
        totalBounces: 0,
        hardBounces: 0,
        softBounces: 0,
        complaints: 0,
        uniqueEmailsBounced: 0,
      };
    }
    return this.bounceTracker.getBounceStats(startDate, endDate);
  }

  /**
   * Get bulk email service (if enabled)
   */
  getBulkEmailService(): BulkEmailService | undefined {
    return this.bulkEmailService;
  }

  /**
   * Send advanced bulk emails with personalization
   */
  async sendAdvancedBulkEmail(
    recipients: Array<{
      email: string;
      name?: string;
      personalizedData?: Record<string, any>;
    }>,
    templateType: string,
    baseData: any,
    options: EmailSendOptions = {}
  ): Promise<BulkEmailResult> {
    if (!this.bulkEmailService) {
      throw new Error('Bulk email service not configured. Please provide bulkQueueUrl in config.');
    }

    // Render base template
    const template = this.templateRegistry.getTemplate(templateType, options.locale);
    if (!template) {
      throw new Error(`Template '${templateType}' not found for locale '${options.locale || 'en'}'`);
    }

    const baseContent = await template.render(baseData, options.locale);

    return this.bulkEmailService.sendBulkEmails(recipients, baseContent, {
      from: options.from,
      replyTo: options.replyTo,
      campaign: options.campaign,
      type: options.type,
      forceQueue: options.queue,
    });
  }

  /**
   * Estimate bulk email sending time
   */
  estimateBulkSendingTime(recipientCount: number) {
    if (this.bulkEmailService) {
      return this.bulkEmailService.estimateSendingTime(recipientCount);
    }

    // Basic estimation if bulk service not available
    const emailsPerMinute = 50;
    return {
      estimatedMinutes: Math.ceil(recipientCount / emailsPerMinute),
      estimatedBatches: Math.ceil(recipientCount / 50),
      recommendedStrategy: recipientCount > 50 ? 'queue' : 'immediate',
    };
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    // Default templates will be loaded from template files at runtime
    // For now, we'll skip loading default templates to fix build issues
    // Users can register their own templates using setTemplates()
    console.log('Default templates loading disabled for initial build');
  }
}