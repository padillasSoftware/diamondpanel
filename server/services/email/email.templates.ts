type Button = {
  label: string
  href: string
}

type BaseTemplateParams = {
  title: string
  preview?: string
  content: string
  button?: Button
}

const brand = {
  bg: '#07130f',
  panel: '#0d1f18',
  panelSoft: '#123225',
  border: '#255947',
  text: '#f8fafc',
  muted: '#b8c7c0',
  primary: '#22c55e',
  accent: '#facc15'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function appName() {
  const config = useRuntimeConfig()
  const leagueName = String(config.public.leagueName || '').trim()

  return leagueName || 'DiamondPanel'
}

export const baseEmailTemplate = ({
  title,
  preview,
  content,
  button
}: BaseTemplateParams) => {
  const name = escapeHtml(appName())

  return `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${brand.bg};font-family:Arial,Helvetica,sans-serif;">
    ${preview ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${brand.bg};padding:36px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
            <tr>
              <td style="background:${brand.panelSoft};border:1px solid ${brand.border};border-radius:16px 16px 0 0;padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:${brand.accent};color:#07130f;font-weight:900;font-size:18px;text-align:center;line-height:34px;">
                        D
                      </span>
                      <span style="color:${brand.text};font-size:20px;font-weight:800;margin-left:10px;vertical-align:middle;">
                        ${name}
                      </span>
                    </td>
                    <td align="right" style="color:${brand.muted};font-size:13px;">
                      DiamondPanel
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:${brand.panel};border-left:1px solid ${brand.border};border-right:1px solid ${brand.border};border-bottom:1px solid ${brand.border};border-radius:0 0 16px 16px;padding:32px 28px;">
                <h1 style="margin:0 0 14px;color:${brand.text};font-size:28px;line-height:1.25;">
                  ${escapeHtml(title)}
                </h1>
                <div style="color:${brand.muted};font-size:15px;line-height:1.7;">
                  ${content}
                </div>
                ${
                  button
                    ? `
                      <div style="margin-top:28px;">
                        <a href="${escapeHtml(button.href)}" style="display:inline-block;background:${brand.accent};color:#07130f;padding:13px 22px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:900;">
                          ${escapeHtml(button.label)}
                        </a>
                      </div>
                    `
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:18px;color:${brand.muted};font-size:12px;line-height:1.6;">
                Este correo fue enviado automáticamente por DiamondPanel.<br />
                No respondas a este mensaje.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

export const infoBox = (content: string) => `
  <div style="background:${brand.panelSoft};border:1px solid ${brand.border};border-radius:12px;padding:16px;margin:20px 0;color:${brand.muted};">
    ${content}
  </div>
`

export const temporaryPasswordBox = (password: string) => `
  <div style="background:#07130f;border:1px solid ${brand.border};border-radius:14px;padding:18px;margin:20px 0;text-align:center;">
    <div style="font-size:12px;color:${brand.muted};margin-bottom:8px;">
      Contraseña temporal
    </div>
    <div style="font-size:24px;color:${brand.text};letter-spacing:1px;font-weight:900;">
      ${escapeHtml(password)}
    </div>
  </div>
`

export const resetPasswordTemplate = (params: {
  name: string
  resetUrl: string
}) => {
  const name = escapeHtml(params.name || 'usuario')

  return baseEmailTemplate({
    title: 'Restablecer contraseña',
    preview: 'Usa este enlace para recuperar el acceso a tu cuenta.',
    button: {
      label: 'Cambiar contraseña',
      href: params.resetUrl
    },
    content: `
      <p style="margin:0 0 14px;">
        Hola <strong style="color:${brand.text};">${name}</strong>, recibimos una solicitud para restablecer tu contraseña.
      </p>
      ${infoBox(`
        <span style="color:${brand.muted};">
          El enlace es temporal. Si tú no solicitaste este cambio, puedes ignorar este correo.
        </span>
      `)}
    `
  })
}

export const welcomeManagerTemplate = (params: {
  name: string
  loginUrl: string
  temporaryPassword: string
  teamName: string
}) => {
  const name = escapeHtml(params.name || 'manejador')
  const teamName = escapeHtml(params.teamName)

  return baseEmailTemplate({
    title: `Bienvenido, ${name}`,
    preview: `Ya puedes administrar ${teamName} en DiamondPanel.`,
    button: {
      label: 'Iniciar sesión',
      href: params.loginUrl
    },
    content: `
      <p style="margin:0 0 14px;">
        Tu cuenta fue creada para administrar <strong style="color:${brand.text};">${teamName}</strong>.
      </p>
      ${temporaryPasswordBox(params.temporaryPassword)}
      ${infoBox(`
        <strong style="color:${brand.text};">Importante:</strong>
        <span style="color:${brand.muted};"> al iniciar sesión se te pedirá cambiar esta contraseña.</span>
      `)}
    `
  })
}
