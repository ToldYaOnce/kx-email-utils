#!/usr/bin/env node
/**
 * CDK App for email infrastructure
 */

import * as cdk from 'aws-cdk-lib';
import { EmailInfrastructureStack } from './email-infrastructure-stack';

const app = new cdk.App();

// Get configuration from context or environment
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const emailDomain = app.node.tryGetContext('emailDomain') || process.env.EMAIL_DOMAIN || 'email.kxtech.io';
const senderEmail = app.node.tryGetContext('senderEmail') || process.env.SENDER_EMAIL || 'invites@kxtech.io';

new EmailInfrastructureStack(app, `EmailInfrastructure-${environment}`, {
  emailDomain,
  senderEmail,
  environment,
  enableBounceTracking: true,
  enableBulkProcessing: true,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: environment,
    Project: 'kx-email-utils',
    Owner: 'KX Tech',
  },
});