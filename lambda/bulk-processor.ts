/**
 * Lambda function to process bulk email jobs from SQS
 */

import { SESClient, SendEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { SQSEvent, Context } from 'aws-lambda';

const sesClient = new SESClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONFIGURATION_SET_NAME = process.env.CONFIGURATION_SET_NAME!;
const BOUNCE_TABLE_NAME = process.env.BOUNCE_TABLE_NAME;

interface BulkEmailMessage {
  jobId: string;
  from: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipients: Array<{
    email: string;
    name?: string;
    personalizedData?: Record<string, any>;
  }>;
  replyTo?: string;
  campaign?: string;
  type?: string;
}

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log(`Processing ${event.Records.length} bulk email jobs`);

  // Check SES sending quota
  const quota = await getSendingQuota();
  console.log('Current SES quota:', quota);

  for (const record of event.Records) {
    try {
      const message: BulkEmailMessage = JSON.parse(record.body);
      await processBulkEmailJob(message);
    } catch (error) {
      console.error('Error processing bulk email job:', error);
      // The message will be moved to DLQ after max retries
      throw error;
    }
  }
};

async function processBulkEmailJob(job: BulkEmailMessage): Promise<void> {
  console.log(`Processing bulk email job ${job.jobId} with ${job.recipients.length} recipients`);

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const recipient of job.recipients) {
    try {
      // Check if email has bounced (if bounce tracking is enabled)
      if (BOUNCE_TABLE_NAME && await hasEmailBounced(recipient.email)) {
        console.log(`Skipping ${recipient.email} - previously bounced`);
        failureCount++;
        results.push({
          email: recipient.email,
          success: false,
          error: 'Email address has previously bounced',
        });
        continue;
      }

      // Personalize content if needed
      let htmlContent = job.htmlContent;
      let textContent = job.textContent;
      let subject = job.subject;

      if (recipient.personalizedData) {
        htmlContent = personalizeContent(htmlContent, {
          ...recipient.personalizedData,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
        });
        
        if (textContent) {
          textContent = personalizeContent(textContent, {
            ...recipient.personalizedData,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
          });
        }

        subject = personalizeContent(subject, {
          ...recipient.personalizedData,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
        });
      }

      // Send email
      const command = new SendEmailCommand({
        Source: job.from,
        Destination: {
          ToAddresses: [recipient.email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: textContent ? {
              Data: textContent,
              Charset: 'UTF-8',
            } : undefined,
          },
        },
        ReplyToAddresses: job.replyTo ? [job.replyTo] : undefined,
        ConfigurationSetName: CONFIGURATION_SET_NAME,
        Tags: [
          { Name: 'JobId', Value: job.jobId },
          { Name: 'Type', Value: job.type || 'bulk' },
          ...(job.campaign ? [{ Name: 'Campaign', Value: job.campaign }] : []),
        ],
      });

      const result = await sesClient.send(command);
      
      successCount++;
      results.push({
        email: recipient.email,
        success: true,
        messageId: result.MessageId,
      });

      console.log(`Sent email to ${recipient.email}, MessageId: ${result.MessageId}`);

      // Add delay to respect SES rate limits (implement basic rate limiting)
      await sleep(100); // 100ms delay = max ~10 emails/second

    } catch (error) {
      failureCount++;
      results.push({
        email: recipient.email,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error(`Failed to send email to ${recipient.email}:`, error);
    }
  }

  console.log(`Bulk job ${job.jobId} completed: ${successCount} success, ${failureCount} failures`);
}

async function getSendingQuota(): Promise<{
  maxSendRate: number;
  max24HourSend: number;
  sentLast24Hours: number;
}> {
  try {
    const command = new GetSendQuotaCommand({});
    const result = await sesClient.send(command);

    return {
      maxSendRate: result.MaxSendRate || 0,
      max24HourSend: result.Max24HourSend || 0,
      sentLast24Hours: result.SentLast24Hours || 0,
    };
  } catch (error) {
    console.error('Failed to get sending quota:', error);
    // Return conservative defaults
    return {
      maxSendRate: 1,
      max24HourSend: 200,
      sentLast24Hours: 0,
    };
  }
}

async function hasEmailBounced(email: string): Promise<boolean> {
  if (!BOUNCE_TABLE_NAME) return false;

  try {
    const command = new QueryCommand({
      TableName: BOUNCE_TABLE_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
      Limit: 1,
      ScanIndexForward: false, // Get most recent first
    });

    const result = await docClient.send(command);
    
    // Check if there are any hard bounces or recent soft bounces
    if (result.Items && result.Items.length > 0) {
      const latestBounce = result.Items[0];
      if (latestBounce.bounceType === 'hard' || latestBounce.bounceType === 'complaint') {
        return true;
      }
      
      // For soft bounces, check if it's recent (within 24 hours)
      if (latestBounce.bounceType === 'soft') {
        const bounceTime = new Date(latestBounce.timestamp);
        const now = new Date();
        const hoursSinceBounce = (now.getTime() - bounceTime.getTime()) / (1000 * 60 * 60);
        return hoursSinceBounce < 24;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking bounce status:', error);
    return false; // Assume not bounced if we can't check
  }
}

function personalizeContent(content: string, data: Record<string, any>): string {
  let personalizedContent = content;
  
  // Simple template variable replacement
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    personalizedContent = personalizedContent.replace(regex, String(value || ''));
  }
  
  return personalizedContent;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}