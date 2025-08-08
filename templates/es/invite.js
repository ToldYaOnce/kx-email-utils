"use strict";
/**
 * Spanish invite email template
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteTemplate = void 0;
exports.inviteTemplate = {
    subject: 'Estás invitado a unirte a {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación a {{companyName}}</title>
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
            <h1>¡Estás Invitado!</h1>
        </div>
        
        <div class="content">
            <p>Hola{{#name}} {{name}}{{/name}},</p>
            
            <p><strong>{{inviterName}}</strong> te ha invitado a unirte a <strong>{{companyName}}</strong> como <span class="role-badge">{{role}}</span>.</p>
            
            {{#message}}
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <p style="margin: 0; font-style: italic;">"{{message}}"</p>
            </div>
            {{/message}}
            
            <p>Haz clic en el botón de abajo para aceptar tu invitación y comenzar:</p>
            
            <div class="button-container">
                <a href="{{inviteUrl}}" class="button">Aceptar Invitación</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
                Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:<br>
                <a href="{{inviteUrl}}" style="color: #2563eb; word-break: break-all;">{{inviteUrl}}</a>
            </p>
        </div>
        
        <div class="footer">
            <p>Esta invitación fue enviada a {{email}}. Si no esperabas esta invitación, puedes ignorar este correo de forma segura.</p>
            <p>© {{companyName}}. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>`,
    text: `
¡Estás invitado a unirte a {{companyName}}!

Hola{{#name}} {{name}}{{/name}},

{{inviterName}} te ha invitado a unirte a {{companyName}} como {{role}}.

{{#message}}
Mensaje de {{inviterName}}:
"{{message}}"

{{/message}}
Para aceptar tu invitación, por favor visita:
{{inviteUrl}}

Esta invitación fue enviada a {{email}}. Si no esperabas esta invitación, puedes ignorar este correo de forma segura.

© {{companyName}}. Todos los derechos reservados.
`,
    defaults: {
        companyName: 'Tu Empresa',
        inviterName: 'Equipo',
        role: 'miembro',
    },
};
//# sourceMappingURL=invite.js.map