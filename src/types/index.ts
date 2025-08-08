/**
 * Core types and interfaces for @kxtech/email-utils
 */

export type Locale = 'en' | 'es' | 'fr' | 'de' | string;

export type EmailType = 'invite' | 'reset-password' | 'marketing' | 'transactional';

/**
 * Configuration for the email service
 */
export interface EmailConfig {
  /** AWS region for SES */
  region: string;
  /** Default sender email address */
  defaultFrom: string;
  /** JWT signing secret for tokens */
  jwtSecret: string;
  /** Default token expiration time */
  defaultTokenExpiry: string;
  /** Whether to use development mode (preview only) */
  devMode?: boolean;
  /** DynamoDB table name for bounce tracking */
  bounceTableName?: string;
  /** SQS queue URL for bulk email processing */
  bulkQueueUrl?: string;
}

/**
 * Basic email sending options
 */
export interface EmailSendOptions {
  /** Override default sender */
  from?: string;
  /** Reply-to address */
  replyTo?: string;
  /** Email subject override */
  subject?: string;
  /** Locale for template rendering */
  locale?: Locale;
  /** Custom template override */
  template?: TemplateRenderer;
  /** Email type for tracking */
  type?: EmailType;
  /** Campaign identifier */
  campaign?: string;
  /** Whether to queue for bulk processing */
  queue?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Core email content structure
 */
export interface EmailContent {
  /** HTML version of the email */
  html: string;
  /** Plain text version of the email */
  text: string;
  /** Email subject */
  subject: string;
}

/**
 * Email recipient information
 */
export interface EmailRecipient {
  /** Recipient email address */
  email: string;
  /** Recipient display name */
  name?: string;
}

/**
 * Complete email message
 */
export interface EmailMessage {
  /** Sender information */
  from: string;
  /** Recipients */
  to: string | string[] | EmailRecipient | EmailRecipient[];
  /** Email content */
  content: EmailContent;
  /** Optional reply-to */
  replyTo?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Message metadata */
  metadata?: {
    type: EmailType;
    campaign?: string;
    locale?: Locale;
  };
}

/**
 * Template renderer interface
 */
export interface TemplateRenderer {
  /**
   * Render email content from template data
   */
  render(data: any, locale?: Locale): Promise<EmailContent>;
}

/**
 * Template data for different email types
 */
export interface InviteEmailInput {
  /** Recipient email */
  email: string;
  /** Recipient name */
  name?: string;
  /** Company/organization name */
  companyName: string;
  /** Company ID for token */
  companyId: string;
  /** Inviter name */
  inviterName: string;
  /** Role being invited to */
  role: string;
  /** Invitation URL with token */
  inviteUrl?: string;
  /** Custom message from inviter */
  message?: string;
}

/**
 * Template data for password reset emails
 */
export interface ResetPasswordInput {
  /** Recipient email */
  email: string;
  /** Recipient name */
  name?: string;
  /** Reset URL with token */
  resetUrl: string;
  /** How long the token is valid */
  expiresIn?: string;
}

/**
 * Token payload for invitations
 */
export interface InviteTokenPayload {
  /** Recipient email */
  email: string;
  /** Company ID */
  companyId: string;
  /** Role */
  role: string;
  /** Token type */
  type: 'invite';
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

/**
 * Token payload for password resets
 */
export interface ResetTokenPayload {
  /** User email */
  email: string;
  /** Token type */
  type: 'reset';
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

/**
 * Bounce/complaint information
 */
export interface BounceInfo {
  /** Email address that bounced */
  email: string;
  /** Bounce type (hard, soft, complaint) */
  type: 'hard' | 'soft' | 'complaint';
  /** Bounce reason */
  reason?: string;
  /** Timestamp when bounce occurred */
  timestamp: Date;
  /** Raw SES notification data */
  rawData?: any;
}

/**
 * Bulk email job configuration
 */
export interface BulkEmailJob {
  /** Job identifier */
  jobId: string;
  /** Email template to use */
  template: string;
  /** Recipients with personalized data */
  recipients: Array<{
    email: string;
    name?: string;
    data: any;
  }>;
  /** Common email options */
  options: EmailSendOptions;
  /** Batch size for processing */
  batchSize?: number;
  /** Schedule for when to send */
  scheduledFor?: Date;
}

/**
 * Email sending result
 */
export interface EmailResult {
  /** Whether sending was successful */
  success: boolean;
  /** SES message ID (if successful) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Recipient email */
  recipient: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Bulk email sending result
 */
export interface BulkEmailResult {
  /** Job identifier */
  jobId: string;
  /** Total recipients */
  totalRecipients: number;
  /** Successfully sent */
  successCount: number;
  /** Failed sends */
  failureCount: number;
  /** Individual results */
  results: EmailResult[];
  /** Overall job status */
  status: 'completed' | 'partial' | 'failed';
}

/**
 * Template collection interface
 */
export interface TemplateCollection {
  /** Invite email templates by locale */
  invite: Record<Locale, TemplateRenderer>;
  /** Reset password templates by locale */
  resetPassword: Record<Locale, TemplateRenderer>;
  /** Custom templates */
  [key: string]: Record<Locale, TemplateRenderer>;
}

/**
 * Email service configuration
 */
export interface EmailServiceConfig extends EmailConfig {
  /** Custom template collection */
  templates?: Partial<TemplateCollection>;
}