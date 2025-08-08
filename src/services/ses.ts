/**
 * AWS SES integration service
 */

import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { convert } from 'html-to-text';
import type { 
  EmailMessage, 
  EmailResult, 
  EmailConfig, 
  EmailRecipient 
} from '../types';

/**
 * SES email service for sending transactional emails
 */
export class SESEmailService {
  private sesClient: SESClient;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.sesClient = new SESClient({ 
      region: config.region 
    });
  }

  /**
   * Send a single email using AWS SES
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const startTime = new Date();
    
    try {
      // Validate message
      this.validateMessage(message);

      // Convert recipients to string array
      const recipients = this.normalizeRecipients(message.to);
      
      if (recipients.length === 1) {
        // Single recipient - use SendEmail
        return await this.sendSingleEmail(message, recipients[0], startTime);
      } else {
        // Multiple recipients - send individually for better error handling
        const results = await Promise.allSettled(
          recipients.map(recipient => 
            this.sendSingleEmail(message, recipient, startTime)
          )
        );

        // Return first successful result or first error
        const firstSuccess = results.find(r => r.status === 'fulfilled')?.value;
        if (firstSuccess) {
          return firstSuccess;
        }

        const firstError = results.find(r => r.status === 'rejected')?.reason;
        throw firstError || new Error('All email sends failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: Array.isArray(message.to) ? message.to[0].toString() : message.to.toString(),
        timestamp: startTime,
      };
    }
  }

  /**
   * Send email to multiple recipients (bulk)
   */
  async sendBulkEmail(message: EmailMessage): Promise<EmailResult[]> {
    const recipients = this.normalizeRecipients(message.to);
    
    const results = await Promise.allSettled(
      recipients.map(recipient => {
        const singleMessage = {
          ...message,
          to: recipient,
        };
        return this.sendEmail(singleMessage);
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          recipient: recipients[index],
          timestamp: new Date(),
        };
      }
    });
  }

  /**
   * Send raw email with full control over headers
   */
  async sendRawEmail(
    rawMessage: string,
    recipients: string[]
  ): Promise<EmailResult[]> {
    try {
      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawMessage),
        },
        Destinations: recipients,
      });

      const result = await this.sesClient.send(command);
      
      return recipients.map(recipient => ({
        success: true,
        messageId: result.MessageId,
        recipient,
        timestamp: new Date(),
      }));
    } catch (error) {
      return recipients.map(recipient => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient,
        timestamp: new Date(),
      }));
    }
  }

  /**
   * Send email to a single recipient
   */
  private async sendSingleEmail(
    message: EmailMessage,
    recipient: string,
    timestamp: Date
  ): Promise<EmailResult> {
    try {
      // Ensure we have both HTML and text content
      const htmlContent = message.content.html;
      const textContent = message.content.text || 
        convert(htmlContent, {
          wordwrap: 130,
          selectors: [
            { selector: 'img', options: { ignoreHref: true } },
            { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }
          ]
        });

      const command = new SendEmailCommand({
        Source: message.from,
        Destination: {
          ToAddresses: [recipient],
        },
        Message: {
          Subject: {
            Data: message.content.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textContent,
              Charset: 'UTF-8',
            },
          },
        },
        ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
        Tags: this.buildSESTags(message),
      });

      const result = await this.sesClient.send(command);

      return {
        success: true,
        messageId: result.MessageId,
        recipient,
        timestamp,
      };
    } catch (error) {
      throw new Error(
        `Failed to send email to ${recipient}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Build SES tags from message metadata
   */
  private buildSESTags(message: EmailMessage): Array<{ Name: string; Value: string }> {
    const tags: Array<{ Name: string; Value: string }> = [];

    if (message.metadata?.type) {
      tags.push({ Name: 'type', Value: message.metadata.type });
    }

    if (message.metadata?.campaign) {
      tags.push({ Name: 'campaign', Value: message.metadata.campaign });
    }

    if (message.metadata?.locale) {
      tags.push({ Name: 'locale', Value: message.metadata.locale });
    }

    return tags;
  }

  /**
   * Normalize recipients to string array
   */
  private normalizeRecipients(to: string | string[] | EmailRecipient | EmailRecipient[]): string[] {
    if (typeof to === 'string') {
      return [to];
    }

    if (Array.isArray(to)) {
      return to.map(recipient => {
        if (typeof recipient === 'string') {
          return recipient;
        }
        return recipient.email;
      });
    }

    // Single EmailRecipient object
    return [to.email];
  }

  /**
   * Validate email message structure
   */
  private validateMessage(message: EmailMessage): void {
    if (!message.from) {
      throw new Error('Sender email address is required');
    }

    if (!message.to) {
      throw new Error('Recipient email address is required');
    }

    if (!message.content.subject) {
      throw new Error('Email subject is required');
    }

    if (!message.content.html && !message.content.text) {
      throw new Error('Email content (HTML or text) is required');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(message.from)) {
      throw new Error('Invalid sender email address');
    }

    const recipients = this.normalizeRecipients(message.to);
    for (const recipient of recipients) {
      if (!emailRegex.test(recipient)) {
        throw new Error(`Invalid recipient email address: ${recipient}`);
      }
    }
  }

  /**
   * Check if an email address has bounced
   */
  async isEmailBounced(email: string): Promise<boolean> {
    // This method is now implemented in BounceTracker service
    // For backwards compatibility, return false here
    return false;
  }

  /**
   * Get SES sending quota and rate limits
   */
  async getSendingQuota(): Promise<{
    maxSendRate: number;
    max24HourSend: number;
    sentLast24Hours: number;
  }> {
    try {
      const { GetSendQuotaCommand } = await import('@aws-sdk/client-ses');
      const command = new GetSendQuotaCommand({});
      const result = await this.sesClient.send(command);

      return {
        maxSendRate: result.MaxSendRate || 0,
        max24HourSend: result.Max24HourSend || 0,
        sentLast24Hours: result.SentLast24Hours || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get sending quota: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}