/**
 * @kxtech/email-utils - Main entry point
 * 
 * A reusable TypeScript package for sending transactional and bulk HTML emails using AWS SES
 */

// Main email service
export { EmailService } from './services/email-service';

// Core services
export { SESEmailService } from './services/ses';
export { TokenService } from './services/tokens';
export { BounceTracker } from './services/bounce-tracker';
export type { BulkEmailConfig } from './services/bulk-email';
export { BulkEmailService } from './services/bulk-email';

// Import types for use in this file
import { EmailService } from './services/email-service';
import { TokenService } from './services/tokens';
import type {
  EmailServiceConfig,
  EmailConfig,
  InviteEmailInput,
  ResetPasswordInput,
  EmailSendOptions,
} from './types';

// Template system
export { 
  TemplateRegistry, 
  MustacheTemplateRenderer,
  createTemplate,
  defaultTemplateRegistry,
  type TemplateDefinition 
} from './templates';

// Types
export type {
  // Core configuration
  EmailConfig,
  EmailServiceConfig,
  
  // Email interfaces
  EmailMessage,
  EmailContent,
  EmailRecipient,
  EmailResult,
  EmailSendOptions,
  
  // Template interfaces
  TemplateRenderer,
  TemplateCollection,
  
  // Input types
  InviteEmailInput,
  ResetPasswordInput,
  
  // Token types
  InviteTokenPayload,
  ResetTokenPayload,
  
  // Bulk email types
  BulkEmailJob,
  BulkEmailResult,
  
  // Bounce tracking
  BounceInfo,
  
  // Utility types
  Locale,
  EmailType,
} from './types';

// Note: Default templates are available through the template registry
// Templates are loaded automatically when EmailService is instantiated

/**
 * Create a new email service instance
 */
export function createEmailService(config: EmailServiceConfig): EmailService {
  return new EmailService(config);
}

/**
 * Convenience function for sending invite emails
 */
export async function sendInviteEmail(
  config: EmailServiceConfig,
  input: InviteEmailInput,
  options?: EmailSendOptions
) {
  const service = new EmailService(config);
  return service.sendInviteEmail(input, options);
}

/**
 * Convenience function for sending password reset emails
 */
export async function sendResetPasswordEmail(
  config: EmailServiceConfig,
  input: ResetPasswordInput,
  options?: EmailSendOptions
) {
  const service = new EmailService(config);
  return service.sendResetPasswordEmail(input, options);
}

/**
 * Convenience function for sending templated emails with custom data
 */
export async function sendTemplatedEmail(
  config: EmailServiceConfig,
  templateType: string,
  email: string,
  data: Record<string, any>,
  options?: EmailSendOptions
) {
  const service = new EmailService(config);
  return service.sendTemplatedEmail(templateType, email, data, options);
}

/**
 * Convenience function for generating invite tokens
 */
export function generateInviteToken(
  config: EmailConfig,
  payload: { email: string; companyId: string; role: string },
  expiresIn?: string
): string {
  const tokenService = new TokenService(config);
  return tokenService.generateInviteToken(payload, expiresIn);
}

/**
 * Convenience function for validating invite tokens
 */
export function validateInviteToken(config: EmailConfig, token: string) {
  const tokenService = new TokenService(config);
  return tokenService.validateInviteToken(token);
}

/**
 * Convenience function for generating reset tokens
 */
export function generateResetToken(
  config: EmailConfig,
  payload: { email: string },
  expiresIn?: string
): string {
  const tokenService = new TokenService(config);
  return tokenService.generateResetToken(payload, expiresIn);
}

/**
 * Convenience function for validating reset tokens
 */
export function validateResetToken(config: EmailConfig, token: string) {
  const tokenService = new TokenService(config);
  return tokenService.validateResetToken(token);
}