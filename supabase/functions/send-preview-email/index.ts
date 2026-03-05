/**
 * Send Preview Email Edge Function
 * Sends a website preview link to a client via Resend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

interface PreviewEmailRequest {
  to: string;
  recipientName?: string;
  companyName?: string;
  previewTitle: string;
  previewLink: string;
  senderName?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: PreviewEmailRequest = await req.json();

    if (!data.to || !data.previewLink || !data.previewTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, previewLink, previewTitle' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const greeting = data.recipientName ? `Beste ${data.recipientName},` : 'Beste,';
    const sender = data.senderName || 'Dirq Solutions';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Website Preview: ${data.previewTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: bold; }
    .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 15px; }
    .content { background: #fff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
    .preview-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .preview-box h2 { margin: 0 0 6px 0; font-size: 18px; color: #111827; }
    .preview-box p { margin: 0; font-size: 13px; color: #6b7280; }
    .cta-button { display: inline-block; background: #667eea; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center; font-size: 16px; }
    .message-box { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #3b82f6; color: #1e40af; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌐 Website Preview</h1>
      <p>${data.previewTitle}</p>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>De website preview staat klaar voor je. Bekijk hieronder hoe de website eruit ziet en laat ons weten wat je ervan vindt.</p>

      ${data.message ? `<div class="message-box">${data.message}</div>` : ''}

      <div class="preview-box">
        <h2>${data.previewTitle}</h2>
        ${data.companyName ? `<p>${data.companyName}</p>` : ''}
      </div>

      <center>
        <a href="${data.previewLink}" class="cta-button">🌐 Bekijk Website Preview</a>
      </center>

      <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
        Je kunt via de preview ook direct aangeven of de website er goed uitziet of dat je opmerkingen hebt.
      </p>

      <p style="margin-top: 30px;">
        Met vriendelijke groet,<br>
        <strong>${sender}</strong>
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Dirq Solutions | Website Ontwikkeling</p>
      <p><a href="${data.previewLink}">Preview bekijken</a></p>
    </div>
  </div>
</body>
</html>`.trim();

    const text = `
Website Preview: ${data.previewTitle}

${greeting}

De website preview staat klaar voor je.
${data.message ? `\n${data.message}\n` : ''}
Bekijk de preview via onderstaande link:
${data.previewLink}

Je kunt via de preview aangeven of de website er goed uitziet of dat je opmerkingen hebt.

Met vriendelijke groet,
${sender}

---
© ${new Date().getFullYear()} Dirq Solutions | Website Ontwikkeling
`.trim();

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dirq Solutions <bas@dirqsolutions.nl>',
        to: data.to,
        subject: `Website Preview: ${data.previewTitle}`,
        html,
        text,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData.message || 'Failed to send email' }),
        { status: resendResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Preview email sent:', resendData.id);

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('Exception:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
