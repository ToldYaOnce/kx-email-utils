/**
 * Lambda function to handle SES bounce and complaint notifications
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SNSEvent, Context } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BOUNCE_TABLE_NAME = process.env.BOUNCE_TABLE_NAME!;

interface SESNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Reject';
  bounce?: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    remoteMtaIp?: string;
    reportingMTA?: string;
  };
  complaint?: {
    complainedRecipients: Array<{
      emailAddress: string;
    }>;
    timestamp: string;
    complaintFeedbackType?: string;
    userAgent?: string;
    complaintSubType?: string;
  };
  mail: {
    timestamp: string;
    messageId: string;
    source: string;
    sourceArn: string;
    sendingAccountId: string;
    destination: string[];
    headersTruncated: boolean;
    headers: Array<{
      name: string;
      value: string;
    }>;
    commonHeaders: {
      from: string[];
      to: string[];
      messageId: string;
      subject: string;
    };
  };
}

export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
  console.log('Processing bounce/complaint notifications:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message) as SESNotification;
      
      if (message.notificationType === 'Bounce' && message.bounce) {
        await handleBounce(message);
      } else if (message.notificationType === 'Complaint' && message.complaint) {
        await handleComplaint(message);
      } else if (message.notificationType === 'Reject') {
        await handleReject(message);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      // Don't throw - we want to continue processing other records
    }
  }
};

async function handleBounce(notification: SESNotification): Promise<void> {
  const bounce = notification.bounce!;
  
  for (const recipient of bounce.bouncedRecipients) {
    const bounceType = bounce.bounceType === 'Permanent' ? 'hard' : 'soft';
    
    await storeBounceInfo({
      email: recipient.emailAddress,
      type: bounceType,
      reason: `${bounce.bounceSubType}: ${recipient.diagnosticCode || 'No diagnostic code'}`,
      timestamp: new Date(bounce.timestamp),
      rawData: notification,
    });

    console.log(`Recorded ${bounceType} bounce for ${recipient.emailAddress}`);
  }
}

async function handleComplaint(notification: SESNotification): Promise<void> {
  const complaint = notification.complaint!;
  
  for (const recipient of complaint.complainedRecipients) {
    await storeBounceInfo({
      email: recipient.emailAddress,
      type: 'complaint',
      reason: `Complaint: ${complaint.complaintFeedbackType || 'Unspecified'}`,
      timestamp: new Date(complaint.timestamp),
      rawData: notification,
    });

    console.log(`Recorded complaint for ${recipient.emailAddress}`);
  }
}

async function handleReject(notification: SESNotification): Promise<void> {
  // For rejects, we don't have specific recipient info, so we store for all destinations
  for (const destination of notification.mail.destination) {
    await storeBounceInfo({
      email: destination,
      type: 'hard',
      reason: 'Email rejected by SES',
      timestamp: new Date(notification.mail.timestamp),
      rawData: notification,
    });

    console.log(`Recorded reject for ${destination}`);
  }
}

async function storeBounceInfo(info: {
  email: string;
  type: 'hard' | 'soft' | 'complaint';
  reason: string;
  timestamp: Date;
  rawData: any;
}): Promise<void> {
  const ttl = Math.floor(info.timestamp.getTime() / 1000) + (365 * 24 * 60 * 60); // 1 year TTL
  
  const item = {
    email: info.email,
    timestamp: info.timestamp.toISOString(),
    bounceType: info.type,
    reason: info.reason,
    ttl,
    rawNotification: info.rawData,
  };

  await docClient.send(new PutCommand({
    TableName: BOUNCE_TABLE_NAME,
    Item: item,
  }));
}