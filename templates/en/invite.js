"use strict";
/**
 * Default English invite email template
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteTemplate = void 0;
exports.inviteTemplate = {
    subject: 'You\'re invited to join {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to {{companyName}}</title>
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
            color: #2563eb;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .button-container {
            text-align: center;
        }
        .footer {
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 30px;
        }
        .role-badge {
            background-color: #f3f4f6;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            color: #374151;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{companyName}}</div>
            <h1>You're Invited!</h1>
        </div>
        
        <div class="content">
            <p>Hi{{#name}} {{name}}{{/name}},</p>
            
            <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{companyName}}</strong> as a <span class="role-badge">{{role}}</span>.</p>
            
            {{#message}}
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <p style="margin: 0; font-style: italic;">"{{message}}"</p>
            </div>
            {{/message}}
            
            <p>Click the button below to accept your invitation and get started:</p>
            
            <div class="button-container">
                <a href="{{inviteUrl}}" class="button">Accept Invitation</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
                If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href="{{inviteUrl}}" style="color: #2563eb; word-break: break-all;">{{inviteUrl}}</a>
            </p>
        </div>
        
        <div class="footer">
            <p>This invitation was sent to {{email}}. If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p>© {{companyName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    text: `
You're invited to join {{companyName}}!

Hi{{#name}} {{name}}{{/name}},

{{inviterName}} has invited you to join {{companyName}} as a {{role}}.

{{#message}}
Message from {{inviterName}}:
"{{message}}"

{{/message}}
To accept your invitation, please visit:
{{inviteUrl}}

This invitation was sent to {{email}}. If you weren't expecting this invitation, you can safely ignore this email.

© {{companyName}}. All rights reserved.
`,
    defaults: {
        companyName: 'Your Company',
        inviterName: 'Team',
        role: 'member',
    },
};
//# sourceMappingURL=invite.js.map