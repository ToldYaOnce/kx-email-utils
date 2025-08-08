"use strict";
/**
 * Spanish password reset email template
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordTemplate = void 0;
exports.resetPasswordTemplate = {
    subject: 'Restablece tu contraseña',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablece tu Contraseña</title>
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
            <div class="logo">🔒 Restablecer Contraseña</div>
            <h1>Restablece tu Contraseña</h1>
        </div>
        
        <div class="content">
            <p>Hola{{#name}} {{name}}{{/name}},</p>
            
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada con <strong>{{email}}</strong>.</p>
            
            <div class="warning">
                <span class="warning-icon">⚠️</span> 
                <strong>Aviso de Seguridad:</strong> Si no solicitaste este restablecimiento de contraseña, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.
            </div>
            
            <p>Para restablecer tu contraseña, haz clic en el botón de abajo:</p>
            
            <div class="button-container">
                <a href="{{resetUrl}}" class="button">Restablecer Contraseña</a>
            </div>
            
            {{#expiresIn}}
            <div class="expiry">
                <strong>⏰ Este enlace expira en {{expiresIn}}.</strong> Después de eso, necesitarás solicitar un nuevo restablecimiento de contraseña.
            </div>
            {{/expiresIn}}
            
            <p style="font-size: 14px; color: #666;">
                Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:<br>
                <a href="{{resetUrl}}" style="color: #dc2626; word-break: break-all;">{{resetUrl}}</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Consejos de Seguridad:</strong></p>
            <ul style="font-size: 14px;">
                <li>Usa una contraseña fuerte y única</li>
                <li>No compartas tu contraseña con nadie</li>
                <li>Considera usar un gestor de contraseñas</li>
            </ul>
            <p>Este restablecimiento de contraseña fue solicitado para {{email}}.</p>
        </div>
    </div>
</body>
</html>`,
    text: `
Restablece tu Contraseña

Hola{{#name}} {{name}}{{/name}},

Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada con {{email}}.

AVISO DE SEGURIDAD: Si no solicitaste este restablecimiento de contraseña, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.

Para restablecer tu contraseña, por favor visita:
{{resetUrl}}

{{#expiresIn}}
Este enlace expira en {{expiresIn}}. Después de eso, necesitarás solicitar un nuevo restablecimiento de contraseña.
{{/expiresIn}}

Consejos de Seguridad:
- Usa una contraseña fuerte y única
- No compartas tu contraseña con nadie
- Considera usar un gestor de contraseñas

Este restablecimiento de contraseña fue solicitado para {{email}}.
`,
    defaults: {
        expiresIn: '24 horas',
    },
};
//# sourceMappingURL=reset-password.js.map