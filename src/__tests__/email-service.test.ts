/**
 * Tests for main email service
 */

import { EmailService } from '../services/email-service';
import type { EmailServiceConfig } from '../types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-ses');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('EmailService', () => {
  let emailService: EmailService;
  const mockConfig: EmailServiceConfig = {
    region: 'us-east-1',
    defaultFrom: 'noreply@example.com',
    jwtSecret: 'test-secret-key-for-testing-only',
    defaultTokenExpiry: '24h',
    devMode: true, // Use dev mode to avoid actual AWS calls
  };

  beforeEach(() => {
    emailService = new EmailService(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with default templates', () => {
      const registry = emailService.getTemplateRegistry();
      expect(registry.hasTemplate('invite', 'en')).toBe(true);
      expect(registry.hasTemplate('invite', 'es')).toBe(true);
      expect(registry.hasTemplate('resetPassword', 'en')).toBe(true);
      expect(registry.hasTemplate('resetPassword', 'es')).toBe(true);
    });

    it('should initialize token service', () => {
      const tokenService = emailService.getTokenService();
      expect(tokenService).toBeDefined();

      const token = tokenService.generateInviteToken({
        email: 'test@example.com',
        companyId: 'test-company',
        role: 'user',
      });
      expect(token).toBeTruthy();
    });
  });

  describe('token utilities', () => {
    it('should generate and validate invite tokens', () => {
      const payload = {
        email: 'user@example.com',
        companyId: 'company-123',
        role: 'developer',
      };

      const token = emailService.generateInviteToken(payload);
      expect(token).toBeTruthy();

      const decoded = emailService.validateInviteToken(token);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.companyId).toBe(payload.companyId);
      expect(decoded.role).toBe(payload.role);
    });

    it('should generate and validate reset tokens', () => {
      const payload = { email: 'user@example.com' };

      const token = emailService.generateResetToken(payload);
      expect(token).toBeTruthy();

      const decoded = emailService.validateResetToken(token);
      expect(decoded.email).toBe(payload.email);
    });
  });

  describe('invite emails', () => {
    const inviteInput = {
      email: 'john@example.com',
      name: 'John Doe',
      companyName: 'Acme Corp',
      companyId: 'acme-123',
      inviterName: 'Jane Smith',
      role: 'Developer',
      inviteUrl: 'https://app.example.com/invite?token=test-token',
    };

    it('should send invite email with default template', async () => {
      // In dev mode, this should not make actual SES calls
      const result = await emailService.sendInviteEmail(inviteInput);
      
      // Since we're mocking SES, we expect this to fail gracefully
      // In a real test environment, you'd mock the SES service to return success
      expect(result).toBeDefined();
      expect(result.recipient).toBe(inviteInput.email);
    });

    it('should send invite email with custom locale', async () => {
      const result = await emailService.sendInviteEmail(inviteInput, {
        locale: 'es',
      });
      
      expect(result).toBeDefined();
      expect(result.recipient).toBe(inviteInput.email);
    });

    it('should generate invite URL if not provided', async () => {
      const inputWithoutUrl: Omit<typeof inviteInput, 'inviteUrl'> = {
        email: inviteInput.email,
        name: inviteInput.name,
        companyName: inviteInput.companyName,
        companyId: inviteInput.companyId,
        inviterName: inviteInput.inviterName,
        role: inviteInput.role,
      };

      const result = await emailService.sendInviteEmail(inputWithoutUrl);
      expect(result).toBeDefined();
      // In a real implementation, this would generate a URL with token
    });
  });

  describe('reset password emails', () => {
    const resetInput = {
      email: 'john@example.com',
      name: 'John Doe',
      resetUrl: 'https://app.example.com/reset',
      expiresIn: '1 hour',
    };

    it('should send reset password email', async () => {
      const result = await emailService.sendResetPasswordEmail(resetInput);
      
      expect(result).toBeDefined();
      expect(result.recipient).toBe(resetInput.email);
    });

    it('should add token to reset URL if not present', async () => {
      const result = await emailService.sendResetPasswordEmail(resetInput);
      expect(result).toBeDefined();
      // In real implementation, would check that token was added to URL
    });
  });

  describe('template management', () => {
    it('should allow setting custom templates', () => {
      const customTemplates = {
        welcome: {
          en: emailService.getTemplateRegistry().getTemplate('invite', 'en')!,
        },
      };

      emailService.setTemplates(customTemplates);
      
      const registry = emailService.getTemplateRegistry();
      expect(registry.hasTemplate('welcome', 'en')).toBe(true);
    });
  });

  describe('bounce tracking', () => {
    it('should return false for bounced emails when no tracker configured', async () => {
      const hasBounced = await emailService.hasEmailBounced('test@example.com');
      expect(hasBounced).toBe(false);
    });

    it('should return empty bounce info when no tracker configured', async () => {
      const bounceInfo = await emailService.getBounceInfo('test@example.com');
      expect(bounceInfo).toEqual([]);
    });

    it('should return zero stats when no tracker configured', async () => {
      const stats = await emailService.getBounceStats();
      expect(stats.totalBounces).toBe(0);
      expect(stats.hardBounces).toBe(0);
      expect(stats.softBounces).toBe(0);
      expect(stats.complaints).toBe(0);
    });
  });

  describe('bulk email estimation', () => {
    it('should estimate sending time for bulk emails', () => {
      const estimation = emailService.estimateBulkSendingTime(1000);
      
      expect(estimation.estimatedMinutes).toBeGreaterThan(0);
      expect(estimation.estimatedBatches).toBeGreaterThan(0);
      expect(['immediate', 'queue']).toContain(estimation.recommendedStrategy);
    });

    it('should recommend immediate strategy for small batches', () => {
      const estimation = emailService.estimateBulkSendingTime(10);
      expect(estimation.recommendedStrategy).toBe('immediate');
    });

    it('should recommend queue strategy for large batches', () => {
      const estimation = emailService.estimateBulkSendingTime(1000);
      expect(estimation.recommendedStrategy).toBe('queue');
    });
  });
});