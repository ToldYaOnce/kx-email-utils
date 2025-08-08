"use strict";
/**
 * Default English password reset email template
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordTemplate = void 0;
exports.resetPasswordTemplate = {
    subject: 'Reset your password',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #b91c1c;
        }
        .button-container {
            text-align: center;
        }
        .warning {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 16px;
            margin: 20px 0;
        }
        .warning-icon {
            color: #dc2626;
            font-weight: bold;
        }
        .footer {
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 30px;
        }
        .expiry {
            font-size: 14px;
            color: #7c2d12;
            background-color: #fed7aa;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔒 Password Reset</div>
            <h1>Reset Your Password</h1>
        </div>
        
        <div class="content">
            <p>Hi{{#name}} {{name}}{{/name}},</p>
            
            <p>We received a request to reset the password for your account associated with <strong>{{email}}</strong>.</p>
            
            <div class="warning">
                <span class="warning-icon">⚠️</span> 
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <p>To reset your password, click the button below:</p>
            
            <div class="button-container">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
            </div>
            
            {{#expiresIn}}
            <div class="expiry">
                <strong>⏰ This link expires in {{expiresIn}}.</strong> After that, you'll need to request a new password reset.
            </div>
            {{/expiresIn}}
            
            <p style="font-size: 14px; color: #666;">
                If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href="{{resetUrl}}" style="color: #dc2626; word-break: break-all;">{{resetUrl}}</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Security Tips:</strong></p>
            <ul style="font-size: 14px;">
                <li>Use a strong, unique password</li>
                <li>Don't share your password with anyone</li>
                <li>Consider using a password manager</li>
            </ul>
            <p>This password reset was requested for {{email}}.</p>
        </div>
    </div>
</body>
</html>`,
    text: `
Reset Your Password

Hi{{#name}} {{name}}{{/name}},

We received a request to reset the password for your account associated with {{email}}.

SECURITY NOTICE: If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

To reset your password, please visit:
{{resetUrl}}

{{#expiresIn}}
This link expires in {{expiresIn}}. After that, you'll need to request a new password reset.
{{/expiresIn}}

Security Tips:
- Use a strong, unique password
- Don't share your password with anyone
- Consider using a password manager

This password reset was requested for {{email}}.
`,
    defaults: {
        expiresIn: '24 hours',
    },
};
//# sourceMappingURL=reset-password.js.map