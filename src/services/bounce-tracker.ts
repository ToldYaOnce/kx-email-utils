/**
 * Service for tracking and querying email bounces
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { BounceInfo, EmailConfig } from '../types';

/**
 * Service for tracking email bounces and complaints
 */
export class BounceTracker {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: EmailConfig) {
    if (!config.bounceTableName) {
      throw new Error('Bounce table name is required for bounce tracking');
    }
    
    this.tableName = config.bounceTableName;
    const dynamoClient = new DynamoDBClient({ region: config.region });
    this.docClient = DynamoDBDocumentClient.from(dynamoClient);
  }

  /**
   * Check if an email address has bounced
   */
  async hasEmailBounced(email: string): Promise<boolean> {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase(),
        },
        Limit: 1,
        ScanIndexForward: false, // Get most recent first
      }));

      if (!result.Items || result.Items.length === 0) {
        return false;
      }

      const latestBounce = result.Items[0];
      
      // Hard bounces and complaints should always suppress
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

      return false;
    } catch (error) {
      console.error('Error checking bounce status:', error);
      return false; // Assume not bounced if we can't check
    }
  }

  /**
   * Get bounce information for an email address
   */
  async getBounceInfo(email: string): Promise<BounceInfo[]> {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase(),
        },
        ScanIndexForward: false, // Most recent first
      }));

      if (!result.Items) {
        return [];
      }

      return result.Items.map(item => ({
        email: item.email,
        type: item.bounceType,
        reason: item.reason,
        timestamp: new Date(item.timestamp),
        rawData: item.rawNotification,
      }));
    } catch (error) {
      console.error('Error getting bounce info:', error);
      return [];
    }
  }

  /**
   * Get latest bounce for an email address
   */
  async getLatestBounce(email: string): Promise<BounceInfo | null> {
    const bounces = await this.getBounceInfo(email);
    return bounces.length > 0 ? bounces[0] : null;
  }

  /**
   * Get all bounces by type within a time range
   */
  async getBouncesByType(
    bounceType: 'hard' | 'soft' | 'complaint',
    startDate?: Date,
    endDate?: Date
  ): Promise<BounceInfo[]> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'BounceTypeIndex',
        KeyConditionExpression: 'bounceType = :type',
        ExpressionAttributeValues: {
          ':type': bounceType,
        },
        ScanIndexForward: false, // Most recent first
      };

      // Add time range filter if provided
      if (startDate || endDate) {
        const filterExpressions = [];
        
        if (startDate) {
          queryParams.ExpressionAttributeValues[':startDate'] = startDate.toISOString();
          filterExpressions.push('#timestamp >= :startDate');
        }
        
        if (endDate) {
          queryParams.ExpressionAttributeValues[':endDate'] = endDate.toISOString();
          filterExpressions.push('#timestamp <= :endDate');
        }

        if (filterExpressions.length > 0) {
          queryParams.FilterExpression = filterExpressions.join(' AND ');
          queryParams.ExpressionAttributeNames = {
            '#timestamp': 'timestamp',
          };
        }
      }

      const result = await this.docClient.send(new QueryCommand(queryParams));

      if (!result.Items) {
        return [];
      }

      return result.Items.map(item => ({
        email: item.email,
        type: item.bounceType,
        reason: item.reason,
        timestamp: new Date(item.timestamp),
        rawData: item.rawNotification,
      }));
    } catch (error) {
      console.error('Error getting bounces by type:', error);
      return [];
    }
  }

  /**
   * Get bounce statistics
   */
  async getBounceStats(startDate?: Date, endDate?: Date): Promise<{
    totalBounces: number;
    hardBounces: number;
    softBounces: number;
    complaints: number;
    uniqueEmailsBounced: number;
  }> {
    try {
      const [hardBounces, softBounces, complaints] = await Promise.all([
        this.getBouncesByType('hard', startDate, endDate),
        this.getBouncesByType('soft', startDate, endDate),
        this.getBouncesByType('complaint', startDate, endDate),
      ]);

      const allBounces = [...hardBounces, ...softBounces, ...complaints];
      const uniqueEmails = new Set(allBounces.map(b => b.email));

      return {
        totalBounces: allBounces.length,
        hardBounces: hardBounces.length,
        softBounces: softBounces.length,
        complaints: complaints.length,
        uniqueEmailsBounced: uniqueEmails.size,
      };
    } catch (error) {
      console.error('Error getting bounce stats:', error);
      return {
        totalBounces: 0,
        hardBounces: 0,
        softBounces: 0,
        complaints: 0,
        uniqueEmailsBounced: 0,
      };
    }
  }

  /**
   * Check multiple email addresses for bounces (batch operation)
   */
  async checkMultipleEmails(emails: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Process in batches to avoid overwhelming DynamoDB
    const batchSize = 25; // DynamoDB batch limit
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async email => ({
          email,
          bounced: await this.hasEmailBounced(email),
        }))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results[result.value.email] = result.value.bounced;
        } else {
          // If we can't check, assume not bounced
          results[batch[batchResults.indexOf(result)]] = false;
        }
      }
    }

    return results;
  }

  /**
   * Get suppression list (all emails that should be suppressed)
   */
  async getSuppressionList(): Promise<string[]> {
    try {
      const [hardBounces, complaints] = await Promise.all([
        this.getBouncesByType('hard'),
        this.getBouncesByType('complaint'),
      ]);

      // Get recent soft bounces (within 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSoftBounces = await this.getBouncesByType('soft', oneDayAgo);

      const suppressedEmails = new Set<string>();
      
      // Add hard bounces and complaints
      hardBounces.forEach(bounce => suppressedEmails.add(bounce.email));
      complaints.forEach(bounce => suppressedEmails.add(bounce.email));
      recentSoftBounces.forEach(bounce => suppressedEmails.add(bounce.email));

      return Array.from(suppressedEmails);
    } catch (error) {
      console.error('Error getting suppression list:', error);
      return [];
    }
  }

  /**
   * Remove an email from suppression (for testing or manual override)
   * Note: This doesn't delete the bounce records, just marks them as ignored
   */
  async removeFromSuppression(email: string): Promise<void> {
    // This would typically involve adding a flag to ignore bounces for this email
    // Implementation depends on specific business requirements
    console.log(`Manual suppression removal for ${email} would be implemented here`);
  }
}