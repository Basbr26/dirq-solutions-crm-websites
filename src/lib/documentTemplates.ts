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

/**
 * Genereer een Re-integratieplan PDF
 */
export async function generateReintegratiePlan(
  caseData: SickLeaveCase,
  company: Company
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 50;

  // Titel
  page.drawText('RE-INTEGRATIEPLAN', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0, 0.48, 0.78),
  });
  y -= 40;

  // Bedrijfsgegevens
  page.drawText('Werkgever', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText(company.naam, { x: 50, y, size: 10, font });
  if (company.adres) {
    y -= 15;
    page.drawText(company.adres, { x: 50, y, size: 10, font });
  }
  y -= 30;

  // Werknemergegevens
  page.drawText('Werknemer', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const employeeName = caseData.employee
    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
    : 'Onbekend';
  page.drawText(employeeName, { x: 50, y, size: 10, font });
  y -= 15;
  const employeeEmail = caseData.employee?.email || 'Onbekend';
  page.drawText(`Email: ${employeeEmail}`, { x: 50, y, size: 10, font });
  y -= 30;

  // Verzuimgegevens
  page.drawText('Verzuimgegevens', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  page.drawText(
    `Startdatum verzuim: ${format(new Date(caseData.start_date), 'dd MMMM yyyy', { locale: nl })}`,
    { x: 50, y, size: 10, font }
  );
  y -= 15;
  
  if (caseData.expected_duration) {
    page.drawText(`Verwachte duur: ${caseData.expected_duration}`, {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 15;
  }
  y -= 20;

  // Functionele beperkingen
  page.drawText('Functionele beperkingen', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const limitations = splitText(caseData.functional_limitations, 80);
  limitations.forEach((line) => {
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 20;

  // Mogelijkheden
  if (caseData.can_work_partial && caseData.partial_work_description) {
    page.drawText('Mogelijkheden voor aangepast werk', {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    });
    y -= 20;
    const partial = splitText(caseData.partial_work_description, 80);
    partial.forEach((line) => {
      page.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    });
    y -= 20;
  }

  // Re-integratie doelstellingen
  page.drawText('Re-integratie doelstellingen', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });
  y -= 20;
  page.drawText('1. Geleidelijke opbouw van werkzaamheden', {
    x: 50,
    y,
    size: 10,
    font,
  });
  y -= 15;
  page.drawText('2. Aanpassingen werkplek indien nodig', { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText('3. Regelmatige evaluatie voortgang', { x: 50, y, size: 10, font });
  y -= 30;

  // Handtekeningen sectie
  page.drawText('Handtekeningen', { x: 50, y, size: 12, font: boldFont });
  y -= 40;

  // Werkgever handtekening
  page.drawText('Werkgever:', { x: 50, y, size: 10, font });
  page.drawLine({
    start: { x: 50, y: y - 40 },
    end: { x: 250, y: y - 40 },
    thickness: 1,
  });
  page.drawText('Datum: _________________', { x: 50, y: y - 60, size: 10, font });

  // Werknemer handtekening
  page.drawText('Werknemer:', { x: 320, y, size: 10, font });
  page.drawLine({
    start: { x: 320, y: y - 40 },
    end: { x: 520, y: y - 40 },
    thickness: 1,
  });
  page.drawText('Datum: _________________', { x: 320, y: y - 60, size: 10, font });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Genereer een Plan van Aanpak PDF
 */
export async function generatePlanVanAanpak(
  caseData: SickLeaveCase,
  company: Company
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  let y = height - 50;

  // Titel
  page.drawText('PLAN VAN AANPAK RE-INTEGRATIE', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0, 0.48, 0.78),
  });
  y -= 40;

  page.drawText(
    `Opgesteld conform artikel 25 Wet WIA en artikel 71a WAO`,
    { x: 50, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
  );
  y -= 30;

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
  page.drawText('1. Probleemstelling en verzuimoorzaak', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });
  y -= 20;
  const limitations = splitText(caseData.functional_limitations, 80);
  limitations.forEach((line) => {
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 20;

  // Sectie 2: Doelstellingen
  page.drawText('2. Concrete doelstellingen', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const goals = [
    '- Volledig werkhervatting binnen ... weken',
    '- Start met aangepast werk op ... (datum)',
    '- Evaluatie na 6 weken door bedrijfsarts',
  ];
  goals.forEach((goal) => {
    page.drawText(goal, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 20;

  // Sectie 3: Acties
  page.drawText('3. Afgesproken acties', { x: 50, y, size: 12, font: boldFont });
  y -= 20;
  const actions = [
    '- Wekelijks contactmoment met leidinggevende',
    '- Geleidelijke opbouw werkuren (schema bijgevoegd)',
    '- Aanpassingen werkplek: ...',
    '- Evaluatie voortgang na 4 weken',
  ];
  actions.forEach((action) => {
    page.drawText(action, { x: 50, y, size: 10, font });
    y -= 15;
  });
  y -= 30;

  // Handtekeningen
  page.drawText('Akkoordverklaring', { x: 50, y, size: 12, font: boldFont });
  y -= 40;

  page.drawText('Werkgever:', { x: 50, y, size: 10, font });
  page.drawLine({
    start: { x: 50, y: y - 40 },
    end: { x: 250, y: y - 40 },
    thickness: 1,
  });

  page.drawText('Werknemer:', { x: 320, y, size: 10, font });
  page.drawLine({
    start: { x: 320, y: y - 40 },
    end: { x: 520, y: y - 40 },
    thickness: 1,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Genereer een Probleemanalyse PDF
 */
export async function generateProbleemanalyse(
  caseData: SickLeaveCase,
  company: Company
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  let y = height - 50;

  page.drawText('PROBLEEMANALYSE', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0, 0.48, 0.78),
  });
  y -= 30;

  page.drawText('(Verplicht binnen 6 weken na eerste ziektedag)', {
    x: 50,
    y,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 40;

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

  // Vragen
  const sections = [
    {
      title: '1. Wat is de oorzaak van het verzuim?',
      content: caseData.functional_limitations,
    },
    {
      title: '2. Welke belemmeringen zijn er voor werkhervatting?',
      content: 'In te vullen door werkgever en werknemer samen',
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
  page.drawText('Ondertekening', { x: 50, y, size: 12, font: boldFont });
  y -= 40;
  page.drawText('Werkgever:', { x: 50, y, size: 10, font });
  page.drawLine({
    start: { x: 50, y: y - 40 },
    end: { x: 250, y: y - 40 },
    thickness: 1,
  });
  page.drawText('Werknemer:', { x: 320, y, size: 10, font });
  page.drawLine({
    start: { x: 320, y: y - 40 },
    end: { x: 520, y: y - 40 },
    thickness: 1,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
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

// Helper functie om tekst te splitsen in regels
function splitText(text: string, maxLength: number): string[] {
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
  return lines;
}
