/**
 * Bulk email service for handling large-scale email operations
 */

import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { SESEmailService } from './ses';
import { BounceTracker } from './bounce-tracker';
import type {
  EmailConfig,
  BulkEmailJob,
  BulkEmailResult,
  EmailResult,
  EmailMessage,
  EmailContent,
} from '../types';

export interface BulkEmailConfig extends EmailConfig {
  /** SQS queue URL for bulk processing */
  bulkQueueUrl?: string;
  /** Maximum batch size for immediate processing */
  maxImmediateBatchSize?: number;
  /** Default chunk size for SQS batching */
  defaultChunkSize?: number;
}

/**
 * Service for handling bulk email operations
 */
export class BulkEmailService {
  private sesService: SESEmailService;
  private bounceTracker?: BounceTracker;
  private sqsClient?: SQSClient;
  private config: BulkEmailConfig;

  constructor(config: BulkEmailConfig) {
    this.config = {
      maxImmediateBatchSize: 50, // Process immediately if under this size
      defaultChunkSize: 10, // SQS batch size
      ...config,
    };

    this.sesService = new SESEmailService(config);
    
    if (config.bounceTableName) {
      this.bounceTracker = new BounceTracker(config);
    }

    if (config.bulkQueueUrl) {
      this.sqsClient = new SQSClient({ region: config.region });
    }
  }

  /**
   * Send bulk emails - automatically chooses between immediate processing or queueing
   */
  async sendBulkEmails(
    recipients: Array<{
      email: string;
      name?: string;
      personalizedData?: Record<string, any>;
    }>,
    emailContent: EmailContent,
    options: {
      from?: string;
      replyTo?: string;
      campaign?: string;
      type?: string;
      forceQueue?: boolean;
      chunkSize?: number;
      scheduledFor?: Date;
    } = {}
  ): Promise<BulkEmailResult> {
    const jobId = this.generateJobId();
    const totalRecipients = recipients.length;

    // Decide whether to process immediately or queue
    const shouldQueue = options.forceQueue || 
                       (this.sqsClient && totalRecipients > this.config.maxImmediateBatchSize!) ||
                       options.scheduledFor;

    if (shouldQueue && this.sqsClient) {
      return this.queueBulkEmailJob({
        jobId,
        recipients,
        emailContent,
        options,
      });
    } else {
      return this.processImmediately({
        jobId,
        recipients,
        emailContent,
        options,
      });
    }
  }

  /**
   * Send bulk templated emails using SES templates
   */
  async sendBulkTemplatedEmails(
    templateName: string,
    recipients: Array<{
      email: string;
      name?: string;
      templateData: Record<string, any>;
    }>,
    options: {
      from?: string;
      replyTo?: string;
      campaign?: string;
      configurationSetName?: string;
      forceQueue?: boolean;
    } = {}
  ): Promise<BulkEmailResult> {
    // This would use SES SendBulkTemplatedEmail API
    // For now, we'll implement basic bulk sending
    const jobId = this.generateJobId();
    
    // Convert to regular bulk email format
    const bulkRecipients = recipients.map(r => ({
      email: r.email,
      name: r.name,
      personalizedData: r.templateData,
    }));

    // For templated emails, we'd typically use a stored SES template
    // This is a simplified implementation
    const emailContent: EmailContent = {
      subject: `Templated Email - ${templateName}`,
      html: '<p>This would be rendered from SES template: {{templateData}}</p>',
      text: 'This would be rendered from SES template: {{templateData}}',
    };

    return this.sendBulkEmails(bulkRecipients, emailContent, {
      ...options,
      type: 'templated',
    });
  }

  /**
   * Queue bulk email job for later processing
   */
  private async queueBulkEmailJob(job: {
    jobId: string;
    recipients: Array<{
      email: string;
      name?: string;
      personalizedData?: Record<string, any>;
    }>;
    emailContent: EmailContent;
    options: any;
  }): Promise<BulkEmailResult> {
    if (!this.sqsClient || !this.config.bulkQueueUrl) {
      throw new Error('SQS client or queue URL not configured for bulk processing');
    }

    const chunkSize = job.options.chunkSize || this.config.defaultChunkSize!;
    const chunks = this.chunkArray(job.recipients, chunkSize);
    
    try {
      // Send each chunk as a separate SQS message
      const messagePromises = chunks.map((chunk, index) => {
        const message = {
          jobId: job.jobId,
          chunkIndex: index,
          totalChunks: chunks.length,
          from: job.options.from || this.config.defaultFrom,
          subject: job.emailContent.subject,
          htmlContent: job.emailContent.html,
          textContent: job.emailContent.text,
          recipients: chunk,
          replyTo: job.options.replyTo,
          campaign: job.options.campaign,
          type: job.options.type || 'bulk',
        };

        return this.sqsClient!.send(new SendMessageCommand({
          QueueUrl: this.config.bulkQueueUrl!,
          MessageBody: JSON.stringify(message),
          DelaySeconds: job.options.scheduledFor ? 
            Math.max(0, Math.floor((job.options.scheduledFor.getTime() - Date.now()) / 1000)) : 
            0,
          MessageAttributes: {
            JobId: {
              DataType: 'String',
              StringValue: job.jobId,
            },
            ChunkIndex: {
              DataType: 'Number',
              StringValue: index.toString(),
            },
            Campaign: job.options.campaign ? {
              DataType: 'String',
              StringValue: job.options.campaign,
            } : undefined,
          },
        }));
      });

      await Promise.all(messagePromises);

      return {
        jobId: job.jobId,
        totalRecipients: job.recipients.length,
        successCount: 0, // Will be updated when processed
        failureCount: 0,
        results: [],
        status: 'completed', // Queued successfully
      };
    } catch (error) {
      return {
        jobId: job.jobId,
        totalRecipients: job.recipients.length,
        successCount: 0,
        failureCount: job.recipients.length,
        results: job.recipients.map(r => ({
          success: false,
          error: `Failed to queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
          recipient: r.email,
          timestamp: new Date(),
        })),
        status: 'failed',
      };
    }
  }

  /**
   * Process bulk email immediately (for smaller batches)
   */
  private async processImmediately(job: {
    jobId: string;
    recipients: Array<{
      email: string;
      name?: string;
      personalizedData?: Record<string, any>;
    }>;
    emailContent: EmailContent;
    options: any;
  }): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Filter out bounced emails if bounce tracking is enabled
    let activeRecipients = job.recipients;
    if (this.bounceTracker) {
      const bounceChecks = await Promise.allSettled(
        job.recipients.map(r => this.bounceTracker!.hasEmailBounced(r.email))
      );

      activeRecipients = job.recipients.filter((_, index) => {
        const bounceResult = bounceChecks[index];
        if (bounceResult.status === 'fulfilled' && bounceResult.value) {
          // Email has bounced, add to failed results
          results.push({
            success: false,
            error: 'Email address has previously bounced',
            recipient: job.recipients[index].email,
            timestamp: new Date(),
          });
          failureCount++;
          return false;
        }
        return true;
      });
    }

    // Process active recipients
    for (const recipient of activeRecipients) {
      try {
        // Personalize content if needed
        let personalizedContent = job.emailContent;
        if (recipient.personalizedData) {
          personalizedContent = this.personalizeContent(job.emailContent, {
            ...recipient.personalizedData,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
          });
        }

        const message: EmailMessage = {
          from: job.options.from || this.config.defaultFrom,
          to: recipient.email,
          content: personalizedContent,
          replyTo: job.options.replyTo,
          metadata: {
            type: job.options.type || 'bulk',
            campaign: job.options.campaign,
          },
        };

        const result = await this.sesService.sendEmail(message);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add small delay to respect rate limits
        await this.sleep(50); // 50ms = ~20 emails/second max
      } catch (error) {
        const errorResult: EmailResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recipient: recipient.email,
          timestamp: new Date(),
        };
        results.push(errorResult);
        failureCount++;
      }
    }

    return {
      jobId: job.jobId,
      totalRecipients: job.recipients.length,
      successCount,
      failureCount,
      results,
      status: failureCount === 0 ? 'completed' : failureCount === results.length ? 'failed' : 'partial',
    };
  }

  /**
   * Personalize email content with recipient data
   */
  private personalizeContent(
    content: EmailContent,
    data: Record<string, any>
  ): EmailContent {
    return {
      subject: this.replaceTokens(content.subject, data),
      html: this.replaceTokens(content.html, data),
      text: this.replaceTokens(content.text, data),
    };
  }

  /**
   * Simple token replacement for personalization
   */
  private replaceTokens(content: string, data: Record<string, any>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }
    
    return result;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current SES sending quota
   */
  async getSendingQuota() {
    return this.sesService.getSendingQuota();
  }

  /**
   * Estimate sending time for bulk job
   */
  estimateSendingTime(recipientCount: number): {
    estimatedMinutes: number;
    estimatedBatches: number;
    recommendedStrategy: 'immediate' | 'queue';
  } {
    const batchSize = this.config.maxImmediateBatchSize!;
    const emailsPerMinute = 50; // Conservative estimate

    return {
      estimatedMinutes: Math.ceil(recipientCount / emailsPerMinute),
      estimatedBatches: Math.ceil(recipientCount / batchSize),
      recommendedStrategy: recipientCount > batchSize ? 'queue' : 'immediate',
    };
  }
}