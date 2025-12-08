import { supabase } from '@/integrations/supabase/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DocumentType, getDocumentDeadline, DOCUMENT_TYPE_LABELS } from '@/types/verzuimDocumentTypes';

interface SickLeaveCase {
  id: string;
  employee_id: string;
  start_date: string;
  functional_limitations: string;
  expected_duration?: string;
  expected_recovery_date?: string;
  availability_notes?: string;
  can_work_partial?: boolean;
  partial_work_description?: string;
  employee?: {
    voornaam: string;
    achternaam: string;
    email: string;
  };
}

interface Company {
  naam: string;
  adres?: string;
  contactpersoon?: string;
}

interface FormData {
  probleemanalyse?: string;
  belemmeringen?: string;
  doelstellingen?: string;
  acties?: string;
}

// Helper functie om tekst te splitsen in regels
function splitText(text: string, maxLength: number): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

// Helper functie voor PDF header
async function createPDFWithHeader(title: string, subtitle?: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  let y = height - 50;

  // Titel
  page.drawText(title, {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0.078, 0.722, 0.651), // Dirq Turquoise
  });
  y -= 30;

  if (subtitle) {
    page.drawText(subtitle, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 30;
  }

  return { pdfDoc, page, font, boldFont, y };
}

/**
 * Genereer een Probleemanalyse PDF
 */
export async function generateProbleemanalyse(
  caseData: SickLeaveCase,
  company: Company,
  formData?: FormData
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'PROBLEEMANALYSE',
    '(Verplicht binnen 6 weken na eerste ziektedag)'
  );

  let y = startY;

  // Gegevens
  const employeeName = caseData.employee
    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
    : 'Onbekend';
  page.drawText(`Werknemer: ${employeeName}`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(`Bedrijf: ${company.naam}`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(
    `Eerste ziektedag: ${format(new Date(caseData.start_date), 'dd-MM-yyyy', { locale: nl })}`,
    { x: 50, y, size: 10, font }
  );
  y -= 40;

  // Secties
  const sections = [
    {
      title: '1. Wat is de oorzaak van het verzuim?',
      content: formData?.probleemanalyse || caseData.functional_limitations,
    },
    {
      title: '2. Welke belemmeringen zijn er voor werkhervatting?',
      content: formData?.belemmeringen || 'In te vullen door werkgever en werknemer samen',
    },
    {
      title: '3. Welke mogelijkheden zijn er voor aangepast werk?',
      content: caseData.partial_work_description || 'In te vullen',
    },
    {
      title: '4. Wat is de verwachte duur van het verzuim?',
      content: caseData.expected_duration || 'In te vullen',
    },
  ];

  sections.forEach((section) => {
    page.drawText(section.title, { x: 50, y, size: 11, font: boldFont });
    y -= 20;
    const lines = splitText(section.content, 80);
    lines.forEach((line) => {
      page.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    });
    y -= 20;
  });

  // Handtekeningen
  y = addSignatureSection(page, font, boldFont, y);

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Genereer een Plan van Aanpak PDF
 */
export async function generatePlanVanAanpak(
  caseData: SickLeaveCase,
  company: Company,
  formData?: FormData
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'PLAN VAN AANPAK RE-INTEGRATIE',
    'Opgesteld conform artikel 25 Wet WIA en artikel 71a WAO'
  );

  let y = startY;

  // Gegevens
  page.drawText('Bedrijf:', { x: 50, y, size: 10, font: boldFont });
  page.drawText(company.naam, { x: 150, y, size: 10, font });
  y -= 20;

  const employeeName = caseData.employee
    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
    : 'Onbekend';
  page.drawText('Werknemer:', { x: 50, y, size: 10, font: boldFont });
  page.drawText(employeeName, { x: 150, y, size: 10, font });
  y -= 20;

  page.drawText('Datum eerste ziektedag:', { x: 50, y, size: 10, font: boldFont });
  page.drawText(
    format(new Date(caseData.start_date), 'dd-MM-yyyy', { locale: nl }),
    { x: 200, y, size: 10, font }
  );
  y -= 40;

  // Sectie 1: Probleemstelling
  page.drawText('1. Probleemstelling en verzuimoorzaak', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const limitations = splitText(formData?.probleemanalyse || caseData.functional_limitations, 80);
  limitations.forEach((line) => {
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 20;

  // Sectie 2: Doelstellingen
  page.drawText('2. Concrete doelstellingen', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const doelen = formData?.doelstellingen
    ? splitText(formData.doelstellingen, 80)
    : ['• Volledig werkhervatting binnen ... weken', '• Start met aangepast werk op ... (datum)', '• Evaluatie na 6 weken door bedrijfsarts'];
  doelen.forEach((doel) => {
    page.drawText(doel, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 20;

  // Sectie 3: Acties
  page.drawText('3. Afgesproken acties', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const acties = formData?.acties
    ? splitText(formData.acties, 80)
    : ['• Wekelijks contactmoment met leidinggevende', '• Geleidelijke opbouw werkuren', '• Aanpassingen werkplek indien nodig', '• Evaluatie voortgang na 4 weken'];
  acties.forEach((actie) => {
    page.drawText(actie, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 30;

  // Handtekeningen
  y = addSignatureSection(page, font, boldFont, y);

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Genereer een Evaluatie PDF
 */
export async function generateEvaluatie(
  caseData: SickLeaveCase,
  company: Company,
  evaluatieType: 'evaluatie_3_maanden' | 'evaluatie_6_maanden' | 'evaluatie_1_jaar',
  formData?: FormData
): Promise<Blob> {
  const titles: Record<string, string> = {
    evaluatie_3_maanden: 'EVALUATIE 3 MAANDEN',
    evaluatie_6_maanden: 'EVALUATIE 42 WEKEN',
    evaluatie_1_jaar: 'EVALUATIE 1 JAAR',
  };

  const subtitles: Record<string, string> = {
    evaluatie_3_maanden: 'Voortgangsevaluatie re-integratie',
    evaluatie_6_maanden: 'Verplichte evaluatie en UWV voorbereiding',
    evaluatie_1_jaar: 'Uitgebreide evaluatie en bijstelling plan',
  };

  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    titles[evaluatieType],
    subtitles[evaluatieType]
  );

  let y = startY;

  // Gegevens
  const employeeName = caseData.employee
    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
    : 'Onbekend';
  page.drawText(`Werknemer: ${employeeName}`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(`Bedrijf: ${company.naam}`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(
    `Eerste ziektedag: ${format(new Date(caseData.start_date), 'dd-MM-yyyy', { locale: nl })}`,
    { x: 50, y, size: 10, font }
  );
  y -= 15;
  page.drawText(`Evaluatiedatum: ${format(new Date(), 'dd-MM-yyyy', { locale: nl })}`, {
    x: 50,
    y,
    size: 10,
    font,
  });
  y -= 40;

  // Secties
  const sections = [
    {
      title: '1. Voortgang sinds laatste evaluatie',
      content: formData?.probleemanalyse || 'Beschrijf de voortgang van de re-integratie',
    },
    {
      title: '2. Huidige situatie en belemmeringen',
      content: formData?.belemmeringen || 'Beschrijf de huidige situatie en eventuele belemmeringen',
    },
    {
      title: '3. Bijgestelde doelstellingen',
      content: formData?.doelstellingen || 'Beschrijf eventueel aangepaste doelstellingen',
    },
    {
      title: '4. Vervolgafspraken',
      content: formData?.acties || 'Beschrijf de afspraken voor de komende periode',
    },
  ];

  sections.forEach((section) => {
    page.drawText(section.title, { x: 50, y, size: 11, font: boldFont });
    y -= 20;
    const lines = splitText(section.content, 80);
    lines.forEach((line) => {
      page.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    });
    y -= 20;
  });

  // Handtekeningen
  y = addSignatureSection(page, font, boldFont, y);

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Genereer een Herstelmelding PDF
 */
export async function generateHerstelmelding(
  caseData: SickLeaveCase,
  company: Company
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'HERSTELMELDING',
    'Officiële melding van (gedeeltelijk) herstel'
  );

  let y = startY;

  const employeeName = caseData.employee
    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
    : 'Onbekend';

  page.drawText(`Werknemer: ${employeeName}`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(`Bedrijf: ${company.naam}`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(
    `Eerste ziektedag: ${format(new Date(caseData.start_date), 'dd-MM-yyyy', { locale: nl })}`,
    { x: 50, y, size: 10, font }
  );
  y -= 15;
  page.drawText(`Datum herstelmelding: ${format(new Date(), 'dd-MM-yyyy', { locale: nl })}`, {
    x: 50,
    y,
    size: 10,
    font,
  });
  y -= 40;

  page.drawText('Type herstel:', { x: 50, y, size: 11, font: boldFont });
  y -= 20;
  page.drawText('☐ Volledig herstel', { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText('☐ Gedeeltelijk herstel (...%)', { x: 50, y, size: 10, font });
  y -= 30;

  page.drawText('Toelichting:', { x: 50, y, size: 11, font: boldFont });
  y -= 20;
  page.drawText('_'.repeat(80), { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText('_'.repeat(80), { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText('_'.repeat(80), { x: 50, y, size: 10, font });
  y -= 40;

  // Handtekeningen
  y = addSignatureSection(page, font, boldFont, y);

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Genereer een UWV 42-weken melding PDF
 */
export async function generateUWVMelding(
  caseData: SickLeaveCase,
  company: Company
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'UWV 42-WEKEN MELDING',
    'Verplichte ziekmelding aan UWV conform Wet Verbetering Poortwachter'
  );

  let y = startY;

  const employeeName = caseData.employee
    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
    : 'Onbekend';

  // Werkgeversgegevens
  page.drawText('WERKGEVERSGEGEVENS', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText(`Bedrijfsnaam: ${company.naam}`, { x: 50, y, size: 10, font });
  y -= 15;
  if (company.adres) {
    page.drawText(`Adres: ${company.adres}`, { x: 50, y, size: 10, font });
    y -= 15;
  }
  y -= 20;

  // Werknemergegevens
  page.drawText('WERKNEMERGEGEVENS', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText(`Naam: ${employeeName}`, { x: 50, y, size: 10, font });
  y -= 15;
  if (caseData.employee?.email) {
    page.drawText(`Email: ${caseData.employee.email}`, { x: 50, y, size: 10, font });
    y -= 15;
  }
  y -= 20;

  // Verzuimgegevens
  page.drawText('VERZUIMGEGEVENS', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText(
    `Eerste ziektedag: ${format(new Date(caseData.start_date), 'dd-MM-yyyy', { locale: nl })}`,
    { x: 50, y, size: 10, font }
  );
  y -= 15;

  const weeksSinceStart = Math.floor(
    (new Date().getTime() - new Date(caseData.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  page.drawText(`Aantal weken verzuim: ${weeksSinceStart} weken`, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(`Datum melding: ${format(new Date(), 'dd-MM-yyyy', { locale: nl })}`, {
    x: 50,
    y,
    size: 10,
    font,
  });
  y -= 30;

  // Verklaring
  page.drawText('VERKLARING', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const verklaring = splitText(
    'Hierbij meld ik dat bovengenoemde werknemer 42 weken arbeidsongeschikt is wegens ziekte. ' +
      'Deze melding wordt gedaan conform de vereisten van de Wet Verbetering Poortwachter.',
    80
  );
  verklaring.forEach((line) => {
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 30;

  // Handtekening werkgever
  page.drawText('Ondertekening werkgever', { x: 50, y, size: 11, font: boldFont });
  y -= 40;
  page.drawText('Naam:', { x: 50, y, size: 10, font });
  page.drawLine({ start: { x: 100, y }, end: { x: 300, y }, thickness: 1 });
  y -= 20;
  page.drawText('Functie:', { x: 50, y, size: 10, font });
  page.drawLine({ start: { x: 100, y }, end: { x: 300, y }, thickness: 1 });
  y -= 20;
  page.drawText('Datum:', { x: 50, y, size: 10, font });
  page.drawLine({ start: { x: 100, y }, end: { x: 200, y }, thickness: 1 });
  y -= 40;
  page.drawText('Handtekening:', { x: 50, y, size: 10, font });
  page.drawLine({ start: { x: 50, y: y - 40 }, end: { x: 250, y: y - 40 }, thickness: 1 });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

// Helper functie voor handtekening sectie
function addSignatureSection(
  page: any,
  font: any,
  boldFont: any,
  y: number
): number {
  page.drawText('Ondertekening', { x: 50, y, size: 12, font: boldFont });
  y -= 40;

  page.drawText('Werkgever:', { x: 50, y, size: 10, font });
  page.drawLine({ start: { x: 50, y: y - 40 }, end: { x: 250, y: y - 40 }, thickness: 1 });
  page.drawText('Datum: _________________', { x: 50, y: y - 60, size: 10, font });

  page.drawText('Werknemer:', { x: 320, y, size: 10, font });
  page.drawLine({ start: { x: 320, y: y - 40 }, end: { x: 520, y: y - 40 }, thickness: 1 });
  page.drawText('Datum: _________________', { x: 320, y: y - 60, size: 10, font });

  return y - 80;
}

/**
 * Upload gegenereerd document naar Supabase
 */
export async function uploadGeneratedDocument(
  caseId: string,
  employeeId: string,
  documentType: DocumentType,
  pdfBlob: Blob,
  userId: string,
  caseStartDate: string
): Promise<string> {
  const fileName = `${documentType}_${Date.now()}.pdf`;
  const filePath = `${userId}/${fileName}`;

  // Upload naar storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, pdfBlob);

  if (uploadError) throw uploadError;

  // Maak document record
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert([{
      file_name: fileName,
      file_url: filePath,
      uploaded_by: userId,
      case_id: caseId,
      document_type: documentType as any,
      requires_signatures: ['employee', 'manager'] as any,
      status: 'pending' as any,
    } as any])
    .select()
    .single();

  if (documentError) throw documentError;

  // Haal employee email op
  const { data: employee } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', employeeId)
    .single();

  // Maak invitation voor employee
  if (employee?.email) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('document_invitations').insert({
      document_id: document.id,
      email: employee.email,
      verification_code: verificationCode,
    });
  }

  // Maak taak voor ondertekening
  const deadline = getDocumentDeadline(documentType, caseStartDate);
  await supabase.from('tasks').insert({
    case_id: caseId,
    title: `${DOCUMENT_TYPE_LABELS[documentType]} ondertekenen`,
    description: 'Document dient ondertekend te worden door medewerker en manager',
    deadline: deadline.toISOString().split('T')[0],
    task_status: 'open',
    assigned_to: employeeId,
  });

  return document.id;
}