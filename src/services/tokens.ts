/**
 * JWT token generation and validation service
 */

import jwt from 'jsonwebtoken';
import type {
  InviteTokenPayload,
  ResetTokenPayload,
  EmailConfig,
} from '../types';

/**
 * Token service for generating and validating JWT tokens
 */
export class TokenService {
  private jwtSecret: string;
  private defaultExpiry: string;

  constructor(config: EmailConfig) {
    this.jwtSecret = config.jwtSecret;
    this.defaultExpiry = config.defaultTokenExpiry;
  }

  /**
   * Generate an invite token
   */
  generateInviteToken(
    payload: {
      email: string;
      companyId: string;
      role: string;
    },
    expiresIn?: string
  ): string {
    const tokenPayload: InviteTokenPayload = {
      ...payload,
      type: 'invite',
    };

    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: expiresIn || this.defaultExpiry,
      issuer: '@kxtech/email-utils',
      audience: 'invite',
    });
  }

  /**
   * Generate a password reset token
   */
  generateResetToken(
    payload: {
      email: string;
    },
    expiresIn?: string
  ): string {
    const tokenPayload: ResetTokenPayload = {
      ...payload,
      type: 'reset',
    };

    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: expiresIn || this.defaultExpiry,
      issuer: '@kxtech/email-utils',
      audience: 'reset',
    });
  }

  /**
   * Validate an invite token
   */
  validateInviteToken(token: string): InviteTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: '@kxtech/email-utils',
        audience: 'invite',
      }) as InviteTokenPayload;

      if (decoded.type !== 'invite') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Invite token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid invite token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate a password reset token
   */
  validateResetToken(token: string): ResetTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: '@kxtech/email-utils',
        audience: 'reset',
      }) as ResetTokenPayload;

      if (decoded.type !== 'reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Reset token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid reset token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate any token and return its payload
   */
  validateToken(token: string): InviteTokenPayload | ResetTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: '@kxtech/email-utils',
      }) as InviteTokenPayload | ResetTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Decode a token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Get token expiration date
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return expiration.getTime() <= Date.now();
  }

  /**
   * Generate a token with custom payload and options
   */
  generateCustomToken(
    payload: Record<string, any>,
    options: {
      expiresIn?: string;
      audience?: string;
      subject?: string;
    } = {}
  ): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: options.expiresIn || this.defaultExpiry,
      issuer: '@kxtech/email-utils',
      audience: options.audience,
      subject: options.subject,
    });
  }

  /**
   * Validate a custom token with specific options
   */
  validateCustomToken(
    token: string,
    options: {
      audience?: string;
      subject?: string;
    } = {}
  ): any {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: '@kxtech/email-utils',
        audience: options.audience,
        subject: options.subject,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Refresh a token (generate a new one with the same payload but extended expiry)
   */
  refreshToken(token: string, expiresIn?: string): string {
    const decoded = this.validateToken(token);
    
    // Remove jwt standard fields
    const { iat, exp, iss, aud, ...payload } = decoded as any;
    
    if (decoded.type === 'invite') {
      return this.generateInviteToken(payload, expiresIn);
    } else if (decoded.type === 'reset') {
      return this.generateResetToken(payload, expiresIn);
    } else {
      throw new Error('Cannot refresh token of unknown type');
    }
  }
}