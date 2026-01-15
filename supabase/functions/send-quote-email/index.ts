/**
 * Send Quote Email Edge Function
 * 🔒 SECURE: API key stays server-side
 * Sends quote notification emails to customers
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

interface QuoteEmailRequest {
  to: string;
  customerName: string;
  companyName?: string;
  quoteNumber: string;
  quoteTitle: string;
  totalAmount: number;
  validUntil?: string;
  viewLink: string;
  pdfLink?: string;
  senderName?: string;
  senderEmail?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const quoteData: QuoteEmailRequest = await req.json();

    // Validate required fields
    if (!quoteData.to || !quoteData.quoteNumber || !quoteData.viewLink) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, quoteNumber, viewLink' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    };

    // Generate email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Offerte ${quoteData.quoteNumber}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      color: #333; 
      line-height: 1.6; 
      margin: 0; 
      padding: 0; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px 20px; 
      border-radius: 8px 8px 0 0; 
      text-align: center;
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: bold;
    }
    .header p { 
      margin: 8px 0 0 0; 
      opacity: 0.9; 
      font-size: 16px;
    }
    .content { 
      background: #fff; 
      padding: 30px 20px; 
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .quote-info { 
      background: #f9fafb; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .quote-info h2 { 
      margin: 0 0 15px 0; 
      font-size: 20px; 
      color: #111827;
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0; 
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child { 
      border-bottom: none; 
    }
    .info-label { 
      color: #6b7280; 
      font-size: 14px;
    }
    .info-value { 
      font-weight: 600; 
      color: #111827;
      font-size: 14px;
    }
    .total { 
      font-size: 24px; 
      font-weight: bold; 
      color: #667eea; 
      margin-top: 10px;
    }
    .cta-button { 
      display: inline-block; 
      background: #667eea; 
      color: white; 
      padding: 14px 32px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: 600; 
      margin: 20px 0;
      text-align: center;
      font-size: 16px;
    }
    .cta-button:hover { 
      background: #5568d3; 
    }
    .message { 
      background: #eff6ff; 
      padding: 15px; 
      border-radius: 6px; 
      margin: 20px 0;
      border-left: 3px solid #3b82f6;
      color: #1e40af;
      font-size: 14px;
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      color: #6b7280; 
      font-size: 12px; 
      border-top: 1px solid #e5e7eb;
    }
    .footer a { 
      color: #667eea; 
      text-decoration: none; 
    }
    .warning { 
      background: #fef3c7; 
      padding: 12px; 
      border-radius: 6px; 
      margin: 15px 0;
      border-left: 3px solid #f59e0b;
      color: #92400e;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Nieuwe Offerte</h1>
      <p>Offerte ${quoteData.quoteNumber}</p>
    </div>
    
    <div class="content">
      <p>Beste ${quoteData.customerName},</p>
      
      <p>Hierbij ontvangt u de offerte voor ${quoteData.quoteTitle}.</p>
      
      ${quoteData.message ? `<div class="message">${quoteData.message}</div>` : ''}
      
      <div class="quote-info">
        <h2>${quoteData.quoteTitle}</h2>
        
        <div class="info-row">
          <span class="info-label">Offertenummer</span>
          <span class="info-value">${quoteData.quoteNumber}</span>
        </div>
        
        ${quoteData.companyName ? `
        <div class="info-row">
          <span class="info-label">Bedrijf</span>
          <span class="info-value">${quoteData.companyName}</span>
        </div>
        ` : ''}
        
        ${quoteData.validUntil ? `
        <div class="info-row">
          <span class="info-label">Geldig tot</span>
          <span class="info-value">${new Date(quoteData.validUntil).toLocaleDateString('nl-NL', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
        ` : ''}
        
        <div class="info-row">
          <span class="info-label">Totaalbedrag</span>
          <span class="total">${formatCurrency(quoteData.totalAmount)}</span>
        </div>
      </div>
      
      <center>
        <a href="${quoteData.viewLink}" class="cta-button">📋 Bekijk Offerte</a>
      </center>
      
      ${quoteData.pdfLink ? `
      <center style="margin-top: 10px;">
        <a href="${quoteData.pdfLink}" style="color: #667eea; text-decoration: none; font-size: 14px;">
          📥 Download PDF
        </a>
      </center>
      ` : ''}
      
      ${quoteData.validUntil ? `
      <div class="warning">
        ⏰ <strong>Let op:</strong> Deze offerte is geldig tot ${new Date(quoteData.validUntil).toLocaleDateString('nl-NL')}.
      </div>
      ` : ''}
      
      <p style="margin-top: 30px;">
        Heeft u vragen over deze offerte? Neem gerust contact met ons op.
      </p>
      
      <p>
        Met vriendelijke groet,<br>
        <strong>${quoteData.senderName || 'Dirq Solutions'}</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Dirq Solutions | Website Ontwikkeling</p>
      <p>
        <a href="${quoteData.viewLink}">Offerte bekijken</a> • 
        <a href="mailto:${quoteData.senderEmail || 'info@dirq.nl'}">Contact opnemen</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Generate plain text version
    const text = `
Offerte ${quoteData.quoteNumber}

Beste ${quoteData.customerName},

Hierbij ontvangt u de offerte voor ${quoteData.quoteTitle}.

${quoteData.message ? `\n${quoteData.message}\n` : ''}

OFFERTE DETAILS
- Offertenummer: ${quoteData.quoteNumber}
${quoteData.companyName ? `- Bedrijf: ${quoteData.companyName}` : ''}
${quoteData.validUntil ? `- Geldig tot: ${new Date(quoteData.validUntil).toLocaleDateString('nl-NL')}` : ''}
- Totaalbedrag: ${formatCurrency(quoteData.totalAmount)}

Bekijk de offerte online:
${quoteData.viewLink}

${quoteData.pdfLink ? `Download PDF:\n${quoteData.pdfLink}\n` : ''}

Heeft u vragen? Neem gerust contact met ons op.

Met vriendelijke groet,
${quoteData.senderName || 'Dirq Solutions'}

---
© ${new Date().getFullYear()} Dirq Solutions | Website Ontwikkeling
    `.trim();

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dirq Solutions <bas@dirqsolutions.nl>',
        to: quoteData.to,
        subject: `Offerte ${quoteData.quoteNumber} - ${quoteData.quoteTitle}`,
        html,
        text,
        reply_to: quoteData.senderEmail || 'info@dirq.nl',
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', resendData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: resendData.message || 'Failed to send email' 
        }),
        { status: resendResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Quote email sent successfully:', resendData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: resendData.id,
        message: 'Quote email sent successfully' 
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('❌ Exception:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
