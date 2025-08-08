/**
 * Tests for JWT token service
 */

import { TokenService } from '../services/tokens';
import type { EmailConfig } from '../types';

describe('TokenService', () => {
  let tokenService: TokenService;
  const mockConfig: EmailConfig = {
    region: 'us-east-1',
    defaultFrom: 'test@example.com',
    jwtSecret: 'test-secret-key-for-testing-only',
    defaultTokenExpiry: '24h',
  };

  beforeEach(() => {
    tokenService = new TokenService(mockConfig);
  });

  describe('invite tokens', () => {
    const invitePayload = {
      email: 'user@example.com',
      companyId: 'company-123',
      role: 'developer',
    };

    it('should generate and validate invite tokens', () => {
      const token = tokenService.generateInviteToken(invitePayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = tokenService.validateInviteToken(token);
      expect(decoded.email).toBe(invitePayload.email);
      expect(decoded.companyId).toBe(invitePayload.companyId);
      expect(decoded.role).toBe(invitePayload.role);
      expect(decoded.type).toBe('invite');
    });

    it('should generate tokens with custom expiry', () => {
      const token = tokenService.generateInviteToken(invitePayload, '1h');
      const decoded = tokenService.validateInviteToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Token should expire in approximately 1 hour
      const expirationTime = decoded.exp! * 1000;
      const expectedExpiration = Date.now() + (60 * 60 * 1000); // 1 hour
      expect(Math.abs(expirationTime - expectedExpiration)).toBeLessThan(5000); // 5 second tolerance
    });

    it('should reject invalid invite tokens', () => {
      expect(() => {
        tokenService.validateInviteToken('invalid-token');
      }).toThrow('Invalid invite token');
    });

    it('should reject tokens with wrong type', () => {
      const resetToken = tokenService.generateResetToken({ email: 'test@example.com' });
      
      expect(() => {
        tokenService.validateInviteToken(resetToken);
      }).toThrow('Invalid token type');
    });
  });

  describe('reset tokens', () => {
    const resetPayload = {
      email: 'user@example.com',
    };

    it('should generate and validate reset tokens', () => {
      const token = tokenService.generateResetToken(resetPayload);
      expect(token).toBeTruthy();

      const decoded = tokenService.validateResetToken(token);
      expect(decoded.email).toBe(resetPayload.email);
      expect(decoded.type).toBe('reset');
    });

    it('should reject invalid reset tokens', () => {
      expect(() => {
        tokenService.validateResetToken('invalid-token');
      }).toThrow('Invalid reset token');
    });
  });

  describe('token utilities', () => {
    it('should decode tokens without verification', () => {
      const token = tokenService.generateInviteToken({
        email: 'test@example.com',
        companyId: 'company-123',
        role: 'admin',
      });

      const decoded = tokenService.decodeToken(token);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.type).toBe('invite');
    });

    it('should get token expiration', () => {
      const token = tokenService.generateInviteToken({
        email: 'test@example.com',
        companyId: 'company-123',
        role: 'admin',
      });

      const expiration = tokenService.getTokenExpiration(token);
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should check if token is expired', () => {
      // Generate a token that expires in 1 second
      const token = tokenService.generateInviteToken({
        email: 'test@example.com',
        companyId: 'company-123',
        role: 'admin',
      }, '1ms');

      // Wait a bit and check expiration
      setTimeout(() => {
        expect(tokenService.isTokenExpired(token)).toBe(true);
      }, 10);
    });

    it('should refresh tokens', () => {
      const originalToken = tokenService.generateInviteToken({
        email: 'test@example.com',
        companyId: 'company-123',
        role: 'admin',
      });

      const refreshedToken = tokenService.refreshToken(originalToken, '48h');
      expect(refreshedToken).not.toBe(originalToken);

      // Both tokens should have same payload but different expiration
      const originalDecoded = tokenService.validateInviteToken(originalToken);
      const refreshedDecoded = tokenService.validateInviteToken(refreshedToken);

      expect(originalDecoded.email).toBe(refreshedDecoded.email);
      expect(originalDecoded.companyId).toBe(refreshedDecoded.companyId);
      expect(originalDecoded.role).toBe(refreshedDecoded.role);
      expect(refreshedDecoded.exp).toBeGreaterThan(originalDecoded.exp!);
    });
  });

  describe('custom tokens', () => {
    it('should generate and validate custom tokens', () => {
      const payload = { customField: 'customValue', userId: 123 };
      const token = tokenService.generateCustomToken(payload, {
        audience: 'custom-app',
        subject: 'custom-action',
      });

      const decoded = tokenService.validateCustomToken(token, {
        audience: 'custom-app',
        subject: 'custom-action',
      });

      expect(decoded.customField).toBe('customValue');
      expect(decoded.userId).toBe(123);
    });

    it('should reject custom tokens with wrong audience', () => {
      const token = tokenService.generateCustomToken({ test: 'value' }, {
        audience: 'app1',
      });

      expect(() => {
        tokenService.validateCustomToken(token, { audience: 'app2' });
      }).toThrow('Invalid token');
    });
  });
});