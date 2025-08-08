/**
 * Express server for previewing email templates
 */

import express from 'express';
import { TemplateRegistry, createTemplate } from '../templates';
import type { Locale, InviteEmailInput, ResetPasswordInput } from '../types';

const app = express();

// Initialize template registry
const templateRegistry = new TemplateRegistry();

// Add basic sample templates for preview
const sampleInviteTemplate = createTemplate({
  subject: 'You\'re invited to join {{companyName}}',
  html: '<h1>Welcome {{name}}!</h1><p>Join {{companyName}} as {{role}}</p><a href="{{inviteUrl}}">Accept</a>',
  text: 'Welcome {{name}}! Join {{companyName}} as {{role}}. Link: {{inviteUrl}}',
});

const sampleResetTemplate = createTemplate({
  subject: 'Reset your password',
  html: '<h1>Password Reset</h1><p>Hi {{name}}, <a href="{{resetUrl}}">reset your password</a></p>',
  text: 'Hi {{name}}, reset your password: {{resetUrl}}',
});

templateRegistry.registerTemplate('invite', 'en', sampleInviteTemplate);
templateRegistry.registerTemplate('resetPassword', 'en', sampleResetTemplate);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

/**
 * Home page with template selector
 */
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Email Template Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .template-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .template-card h3 {
            margin-top: 0;
            color: #333;
        }
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            border-radius: 4px;
            margin: 5px;
        }
        .btn:hover {
            background-color: #1d4ed8;
        }
        .locale-selector {
            margin: 10px 0;
        }
        .form-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-group textarea {
            height: 80px;
            resize: vertical;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Email Template Preview</h1>
            <p>Preview and test your email templates with sample data</p>
        </div>

        <div class="template-grid">
            <div class="template-card">
                <h3>🎯 Invite Email</h3>
                <p>User invitation email with company details and role assignment</p>
                <div class="locale-selector">
                    <a href="/preview/invite?locale=en" class="btn">English</a>
                    <a href="/preview/invite?locale=es" class="btn">Español</a>
                </div>
            </div>

            <div class="template-card">
                <h3>🔒 Password Reset</h3>
                <p>Secure password reset email with time-limited token</p>
                <div class="locale-selector">
                    <a href="/preview/reset-password?locale=en" class="btn">English</a>
                    <a href="/preview/reset-password?locale=es" class="btn">Español</a>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3>Custom Preview</h3>
            <p>Test templates with your own data:</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4>Invite Email</h4>
                    <form action="/preview/invite" method="get">
                        <div class="form-group">
                            <label>Email:</label>
                            <input type="email" name="email" value="john.doe@example.com">
                        </div>
                        <div class="form-group">
                            <label>Name:</label>
                            <input type="text" name="name" value="John Doe">
                        </div>
                        <div class="form-group">
                            <label>Company:</label>
                            <input type="text" name="companyName" value="Acme Corp">
                        </div>
                        <div class="form-group">
                            <label>Inviter:</label>
                            <input type="text" name="inviterName" value="Jane Smith">
                        </div>
                        <div class="form-group">
                            <label>Role:</label>
                            <input type="text" name="role" value="Developer">
                        </div>
                        <div class="form-group">
                            <label>Locale:</label>
                            <select name="locale">
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                        <button type="submit" class="btn">Preview Invite</button>
                    </form>
                </div>

                <div>
                    <h4>Reset Password Email</h4>
                    <form action="/preview/reset-password" method="get">
                        <div class="form-group">
                            <label>Email:</label>
                            <input type="email" name="email" value="john.doe@example.com">
                        </div>
                        <div class="form-group">
                            <label>Name:</label>
                            <input type="text" name="name" value="John Doe">
                        </div>
                        <div class="form-group">
                            <label>Expires In:</label>
                            <input type="text" name="expiresIn" value="24 hours">
                        </div>
                        <div class="form-group">
                            <label>Locale:</label>
                            <select name="locale">
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                        <button type="submit" class="btn">Preview Reset</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  
  res.send(html);
});

/**
 * Preview invite email template
 */
app.get('/preview/invite', async (req, res) => {
  try {
    const locale = (req.query.locale as Locale) || 'en';
    
    // Sample data - can be overridden by query params
    const sampleData: InviteEmailInput = {
      email: req.query.email as string || 'john.doe@example.com',
      name: req.query.name as string || 'John Doe',
      companyName: req.query.companyName as string || 'Acme Corporation',
      companyId: req.query.companyId as string || 'acme-corp-123',
      inviterName: req.query.inviterName as string || 'Jane Smith',
      role: req.query.role as string || 'Software Developer',
      inviteUrl: req.query.inviteUrl as string || 'https://app.example.com/invite?token=abc123xyz789',
      message: req.query.message as string || 'Welcome to our team! We are excited to have you join us.',
    };

    const template = templateRegistry.getTemplate('invite', locale);
    if (!template) {
      return res.status(404).send(`Template not found for locale: ${locale}`);
    }

    const content = await template.render(sampleData, locale);
    
    const previewHtml = generatePreviewHtml(content, {
      type: 'invite',
      locale,
      data: sampleData,
    });

    return res.send(previewHtml);
  } catch (error) {
    return res.status(500).send(`Error rendering template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Preview reset password email template
 */
app.get('/preview/reset-password', async (req, res) => {
  try {
    const locale = (req.query.locale as Locale) || 'en';
    
    // Sample data - can be overridden by query params
    const sampleData: ResetPasswordInput = {
      email: req.query.email as string || 'john.doe@example.com',
      name: req.query.name as string || 'John Doe',
      resetUrl: req.query.resetUrl as string || 'https://app.example.com/reset?token=def456uvw012',
      expiresIn: req.query.expiresIn as string || '24 hours',
    };

    const template = templateRegistry.getTemplate('resetPassword', locale);
    if (!template) {
      return res.status(404).send(`Template not found for locale: ${locale}`);
    }

    const content = await template.render(sampleData, locale);
    
    const previewHtml = generatePreviewHtml(content, {
      type: 'reset-password',
      locale,
      data: sampleData,
    });

    return res.send(previewHtml);
  } catch (error) {
    return res.status(500).send(`Error rendering template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Get plain text version of template
 */
app.get('/preview/:type/text', async (req, res) => {
  try {
    const { type } = req.params;
    const locale = (req.query.locale as Locale) || 'en';
    
    let sampleData: any;
    if (type === 'invite') {
      sampleData = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        companyName: 'Acme Corporation',
        companyId: 'acme-corp-123',
        inviterName: 'Jane Smith',
        role: 'Software Developer',
        inviteUrl: 'https://app.example.com/invite?token=abc123xyz789',
      };
    } else if (type === 'reset-password') {
      sampleData = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        resetUrl: 'https://app.example.com/reset?token=def456uvw012',
        expiresIn: '24 hours',
      };
    } else {
      return res.status(404).send('Template type not found');
    }

    const template = templateRegistry.getTemplate(type, locale);
    if (!template) {
      return res.status(404).send(`Template not found for locale: ${locale}`);
    }

    const content = await template.render(sampleData, locale);
    
    res.type('text/plain');
    return res.send(content.text);
  } catch (error) {
    return res.status(500).send(`Error rendering template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * API endpoint to get available templates
 */
app.get('/api/templates', (req, res) => {
  const templates = templateRegistry.getAvailableTypes().map(type => ({
    type,
    locales: templateRegistry.getAvailableLocales(type),
  }));

  res.json({ templates });
});

/**
 * Generate preview HTML with template metadata
 */
function generatePreviewHtml(content: { html: string; text: string; subject: string }, meta: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Email Preview - ${meta.type}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .preview-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .toolbar {
            background: #333;
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .toolbar h2 {
            margin: 0;
            font-size: 18px;
        }
        .toolbar .meta {
            font-size: 14px;
            opacity: 0.8;
        }
        .tabs {
            display: flex;
            background: #444;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            background: #444;
            color: white;
            border: none;
            font-size: 14px;
        }
        .tab.active {
            background: white;
            color: #333;
        }
        .tab:hover:not(.active) {
            background: #555;
        }
        .content {
            background: white;
            min-height: 600px;
            border-radius: 0 0 8px 8px;
        }
        .email-preview {
            padding: 20px;
        }
        .text-preview {
            padding: 20px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            display: none;
        }
        .subject-line {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #ddd;
            font-weight: 500;
        }
        .back-link {
            color: white;
            text-decoration: none;
            opacity: 0.8;
        }
        .back-link:hover {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="toolbar">
            <div>
                <h2>📧 Email Preview - ${meta.type}</h2>
                <div class="meta">
                    Locale: ${meta.locale} | 
                    Recipient: ${meta.data.email || 'N/A'}
                </div>
            </div>
            <a href="/" class="back-link">← Back to Templates</a>
        </div>
        
        <div class="subject-line">
            <strong>Subject:</strong> ${content.subject}
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('html')">HTML Preview</button>
            <button class="tab" onclick="showTab('text')">Plain Text</button>
        </div>
        
        <div class="content">
            <div id="html-content" class="email-preview">
                ${content.html}
            </div>
            <div id="text-content" class="text-preview">
${content.text}
            </div>
        </div>
    </div>

    <script>
        function showTab(tab) {
            // Update tab appearance
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            
            // Show/hide content
            document.getElementById('html-content').style.display = tab === 'html' ? 'block' : 'none';
            document.getElementById('text-content').style.display = tab === 'text' ? 'block' : 'none';
        }
    </script>
</body>
</html>`;
}

/**
 * Start the preview server
 */
export function startPreviewServer(port: number = 3000): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`📧 Email preview server running at http://localhost:${port}`);
      console.log('Available templates:');
      templateRegistry.getAvailableTypes().forEach(type => {
        const locales = templateRegistry.getAvailableLocales(type);
        console.log(`  - ${type}: ${locales.join(', ')}`);
      });
      resolve();
    });
  });
}

// Export app for external use
export { app as previewApp };

// If this file is run directly, start the server
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  startPreviewServer(port).catch(console.error);
}