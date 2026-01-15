/**
 * Supabase Edge Function: Send E-Sign Email
 * Sends email invitation with document signing link via Resend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailRequest {
  to: string
  documentTitle: string
  documentId: string
  signToken: string
  companyName?: string
  expiresAt: string
  senderName?: string
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { 
      to, 
      documentTitle, 
      documentId, 
      signToken, 
      companyName,
      expiresAt,
      senderName = 'Dirq Solutions'
    }: EmailRequest = await req.json()

    // Validate input
    if (!to || !documentTitle || !signToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get app URL from request origin
    const origin = req.headers.get('origin') || 'https://your-app.com'
    const signUrl = `${origin}/sign-quote/${signToken}`
    
    // Format expiry date
    const expiryDate = new Date(expiresAt).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Prepare email HTML
    const emailHtml = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document ter ondertekening</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📝 Document ter ondertekening
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Beste,
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                ${companyName ? `<strong>${companyName}</strong> heeft` : 'U heeft'} een document ontvangen dat digitaal ondertekend moet worden:
              </p>

              <!-- Document Info Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #667eea; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Document
                    </p>
                    <p style="margin: 0 0 5px; color: #333333; font-size: 18px; font-weight: 600;">
                      ${documentTitle}
                    </p>
                    <p style="margin: 0; color: #6c757d; font-size: 14px;">
                      Document ID: ${documentId.substring(0, 8)}...
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Klik op de onderstaande knop om het document te bekijken en digitaal te ondertekenen. Het proces duurt slechts enkele minuten.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${signUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                      Document ondertekenen →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #fff8e1; border-radius: 6px; border-left: 4px solid #ffc107;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #f57c00; font-size: 14px; font-weight: 600;">
                      ℹ️ Hoe werkt het?
                    </p>
                    <ol style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                      <li>Klik op de knop hierboven</li>
                      <li>Bekijk het document</li>
                      <li>Vul uw naam en e-mailadres in</li>
                      <li>Teken digitaal met uw vinger of muis</li>
                      <li>Bevestig uw handtekening</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <!-- Security Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                    <p style="margin: 0 0 10px; color: #333333; font-size: 14px; font-weight: 600;">
                      🔒 Veiligheid en privacy
                    </p>
                    <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.5;">
                      Deze link is uniek en beveiligd. De ondertekening wordt gelogd met IP-adres en tijdstempel voor juridische geldigheid. Het ondertekende document wordt veilig opgeslagen.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiry Warning -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td style="padding: 15px 20px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      ⏰ <strong>Let op:</strong> Deze link is geldig tot <strong>${expiryDate}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #333333; font-size: 14px; line-height: 1.6;">
                Mocht de knop niet werken, kopieer dan deze link in uw browser:
              </p>
              <p style="margin: 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px; color: #667eea; font-size: 12px; font-family: monospace; word-break: break-all;">
                ${signUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6c757d; font-size: 14px;">
                Heeft u vragen? Neem contact op met ${senderName}
              </p>
              <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                Dit is een automatisch gegenereerde e-mail voor documentondertekening.
              </p>
              <p style="margin: 10px 0 0; color: #adb5bd; font-size: 11px;">
                © ${new Date().getFullYear()} ${senderName}. Alle rechten voorbehouden.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <noreply@dirqsolutions.nl>`,
        to: [to],
        subject: `📝 Document ter ondertekening: ${documentTitle}`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('Resend error:', errorText)
      throw new Error(`Resend API error: ${errorText}`)
    }

    const resendData = await resendResponse.json()

    // Optionally log email send in database (only if email_logs table exists)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      await supabase.from('email_logs').insert({
        document_id: documentId,
        recipient: to,
        subject: `Document ter ondertekening: ${documentTitle}`,
        sent_at: new Date().toISOString(),
        provider: 'resend',
        external_id: resendData.id,
      })
    } catch (logError) {
      // Ignore logging errors - email was still sent successfully
      console.warn('Could not log email to database:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: resendData.id 
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})
