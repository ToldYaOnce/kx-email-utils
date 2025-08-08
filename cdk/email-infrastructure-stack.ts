/**
 * AWS CDK stack for email infrastructure
 */

import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface EmailInfrastructureStackProps extends cdk.StackProps {
  /** Domain to verify for sending emails */
  emailDomain: string;
  /** Specific sender email to verify */
  senderEmail: string;
  /** Environment name (dev, staging, prod) */
  environment: string;
  /** Whether to enable bounce tracking */
  enableBounceTracking?: boolean;
  /** Whether to enable bulk email processing */
  enableBulkProcessing?: boolean;
}

/**
 * CDK stack for email infrastructure using AWS SES
 */
export class EmailInfrastructureStack extends cdk.Stack {
  public readonly sesConfigurationSet: ses.ConfigurationSet;
  public readonly bounceTable?: dynamodb.Table;
  public readonly bulkEmailQueue?: sqs.Queue;
  public readonly bulkEmailDeadLetterQueue?: sqs.Queue;
  public readonly emailSendingRole: iam.Role;
  public readonly bounceHandlerFunction?: lambda.Function;
  public readonly bulkProcessorFunction?: lambda.Function;

  constructor(scope: Construct, id: string, props: EmailInfrastructureStackProps) {
    super(scope, id, props);

    // SES Configuration Set for tracking
    this.sesConfigurationSet = new ses.ConfigurationSet(this, 'EmailConfigurationSet', {
      configurationSetName: `${props.environment}-email-config`,
    });

    // Domain verification (requires manual DNS setup)
    const emailDomain = new ses.EmailIdentity(this, 'EmailDomain', {
      identity: ses.Identity.domain(props.emailDomain),
      configurationSet: this.sesConfigurationSet,
    });

    // Specific sender email verification
    const senderEmail = new ses.EmailIdentity(this, 'SenderEmail', {
      identity: ses.Identity.email(props.senderEmail),
      configurationSet: this.sesConfigurationSet,
    });

    // IAM role for email sending
    this.emailSendingRole = new iam.Role(this, 'EmailSendingRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        EmailSendingPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:SendBulkTemplatedEmail',
                'ses:GetSendQuota',
                'ses:GetSendStatistics',
              ],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'ses:FromAddress': props.senderEmail,
                },
              },
            }),
          ],
        }),
      },
    });

    // Bounce tracking setup
    if (props.enableBounceTracking) {
      this.setupBounceTracking(props);
    }

    // Bulk email processing setup
    if (props.enableBulkProcessing) {
      this.setupBulkProcessing(props);
    }

    // Outputs
    new cdk.CfnOutput(this, 'ConfigurationSetName', {
      value: this.sesConfigurationSet.configurationSetName,
      description: 'SES Configuration Set Name',
    });

    new cdk.CfnOutput(this, 'EmailSendingRoleArn', {
      value: this.emailSendingRole.roleArn,
      description: 'IAM Role ARN for email sending',
    });

    new cdk.CfnOutput(this, 'DomainVerificationTxtRecord', {
      value: emailDomain.dkimRecords.join(', '),
      description: 'DKIM TXT records to add to DNS (comma-separated)',
    });

    if (this.bounceTable) {
      new cdk.CfnOutput(this, 'BounceTableName', {
        value: this.bounceTable.tableName,
        description: 'DynamoDB table for bounce tracking',
      });
    }

    if (this.bulkEmailQueue) {
      new cdk.CfnOutput(this, 'BulkEmailQueueUrl', {
        value: this.bulkEmailQueue.queueUrl,
        description: 'SQS queue URL for bulk email processing',
      });
    }
  }

  /**
   * Set up bounce and complaint tracking
   */
  private setupBounceTracking(props: EmailInfrastructureStackProps): void {
    // DynamoDB table for storing bounce information
    this.bounceTable = new dynamodb.Table(this, 'BounceTable', {
      tableName: `${props.environment}-email-bounces`,
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // Add GSI for querying by bounce type
    this.bounceTable.addGlobalSecondaryIndex({
      indexName: 'BounceTypeIndex',
      partitionKey: {
        name: 'bounceType',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // SNS topic for bounce notifications
    const bounceTopic = new sns.Topic(this, 'BounceTopic', {
      topicName: `${props.environment}-email-bounces`,
    });

    // Lambda function to handle bounce notifications
    this.bounceHandlerFunction = new lambda.Function(this, 'BounceHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'bounce-handler.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BOUNCE_TABLE_NAME: this.bounceTable.tableName,
      },
      timeout: cdk.Duration.minutes(1),
    });

    // Grant permissions
    this.bounceTable.grantWriteData(this.bounceHandlerFunction);
    bounceTopic.addSubscription(
      new sns.LambdaSubscription(this.bounceHandlerFunction)
    );

    // Add bounce handler to email sending role
    this.emailSendingRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:Query',
        ],
        resources: [this.bounceTable.tableArn, `${this.bounceTable.tableArn}/index/*`],
      })
    );

    // Configure SES to publish to SNS
    new ses.ConfigurationSetEventDestination(this, 'BounceEventDestination', {
      configurationSet: this.sesConfigurationSet,
      destination: ses.EventDestination.snsTopic(bounceTopic),
      events: [
        ses.EmailSendingEvent.BOUNCE,
        ses.EmailSendingEvent.COMPLAINT,
        ses.EmailSendingEvent.REJECT,
      ],
    });
  }

  /**
   * Set up bulk email processing infrastructure
   */
  private setupBulkProcessing(props: EmailInfrastructureStackProps): void {
    // Dead letter queue
    this.bulkEmailDeadLetterQueue = new sqs.Queue(this, 'BulkEmailDLQ', {
      queueName: `${props.environment}-bulk-email-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Main queue for bulk email processing
    this.bulkEmailQueue = new sqs.Queue(this, 'BulkEmailQueue', {
      queueName: `${props.environment}-bulk-email`,
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: {
        queue: this.bulkEmailDeadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // Lambda function to process bulk emails
    this.bulkProcessorFunction = new lambda.Function(this, 'BulkEmailProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'bulk-processor.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        CONFIGURATION_SET_NAME: this.sesConfigurationSet.configurationSetName,
        BOUNCE_TABLE_NAME: this.bounceTable?.tableName || '',
      },
      timeout: cdk.Duration.minutes(5),
      reservedConcurrentExecutions: 10, // Limit concurrent executions to respect SES limits
    });

    // Event source mapping
    this.bulkProcessorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.bulkEmailQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    // Grant permissions
    this.emailSendingRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
        ],
        resources: [this.bulkEmailQueue.queueArn],
      })
    );

    this.bulkProcessorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendBulkTemplatedEmail',
          'ses:GetSendQuota',
        ],
        resources: ['*'],
      })
    );

    if (this.bounceTable) {
      this.bounceTable.grantReadData(this.bulkProcessorFunction);
    }

    // S3 bucket for storing large email templates or attachments (optional)
    const templateBucket = new s3.Bucket(this, 'EmailTemplateBucket', {
      bucketName: `${props.environment}-email-templates-${cdk.Aws.ACCOUNT_ID}`,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    templateBucket.grantRead(this.bulkProcessorFunction);
    templateBucket.grantRead(this.emailSendingRole);

    new cdk.CfnOutput(this, 'TemplateBucketName', {
      value: templateBucket.bucketName,
      description: 'S3 bucket for email templates',
    });
  }
}