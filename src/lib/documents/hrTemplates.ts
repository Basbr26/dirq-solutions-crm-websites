import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  date_of_birth?: string;
  employee_number?: string;
  functie?: string;
  start_date?: string;
  contract_type?: string;
  hours_per_week?: number;
  department?: {
    name: string;
  };
}

interface Company {
  naam: string;
  adres?: string;
  postcode?: string;
  plaats?: string;
  kvk?: string;
  contactpersoon?: string;
  telefoon?: string;
  email?: string;
}

// Helper functions
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

async function createPDFWithHeader(title: string, subtitle?: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  let y = height - 50;

  // Header met logo/branding kleur
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
 * Generate Arbeidsovereenkomst PDF
 */
export async function generateArbeidsovereenkomst(
  employee: Employee,
  company: Company,
  contractData?: {
    salaris?: number;
    vakantiedagen?: number;
    proeftijd?: number;
    startdatum?: string;
    einddatum?: string; // Voor tijdelijke contracten
    bijzondereBepalingen?: string;
  }
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'ARBEIDSOVEREENKOMST',
    `Contract tussen ${company.naam} en ${employee.voornaam} ${employee.achternaam}`
  );

  let y = startY;
  const contractType = employee.contract_type || 'vast';
  const startDatum = contractData?.startdatum || employee.start_date || format(new Date(), 'dd-MM-yyyy', { locale: nl });

  // Partijen
  page.drawText('PARTIJEN', { x: 50, y, size: 12, font: boldFont });
  y -= 25;

  page.drawText('Werkgever:', { x: 50, y, size: 10, font: boldFont });
  y -= 15;
  page.drawText(company.naam, { x: 50, y, size: 10, font });
  y -= 15;
  if (company.adres) page.drawText(company.adres, { x: 50, y, size: 10, font });
  y -= 15;
  if (company.postcode && company.plaats) {
    page.drawText(`${company.postcode} ${company.plaats}`, { x: 50, y, size: 10, font });
    y -= 15;
  }
  if (company.kvk) page.drawText(`KvK: ${company.kvk}`, { x: 50, y, size: 10, font });
  y -= 30;

  page.drawText('Werknemer:', { x: 50, y, size: 10, font: boldFont });
  y -= 15;
  page.drawText(`${employee.voornaam} ${employee.achternaam}`, { x: 50, y, size: 10, font });
  y -= 15;
  if (employee.address) page.drawText(employee.address, { x: 50, y, size: 10, font });
  y -= 15;
  if (employee.postal_code && employee.city) {
    page.drawText(`${employee.postal_code} ${employee.city}`, { x: 50, y, size: 10, font });
    y -= 15;
  }
  if (employee.date_of_birth) {
    page.drawText(`Geboortedatum: ${format(new Date(employee.date_of_birth), 'dd-MM-yyyy', { locale: nl })}`, 
      { x: 50, y, size: 10, font });
    y -= 15;
  }
  y -= 30;

  // Artikelen
  const articles = [
    {
      number: 1,
      title: 'Functie en Werkzaamheden',
      content: `De werknemer wordt aangesteld als ${employee.functie || '[Functie]'} bij de afdeling ${employee.department?.name || '[Afdeling]'}. De werknemer zal de werkzaamheden uitvoeren die bij deze functie horen en verder alle werkzaamheden die in redelijkheid kunnen worden opgedragen.`
    },
    {
      number: 2,
      title: 'Duur van de Overeenkomst',
      content: contractType === 'tijdelijk' 
        ? `Deze overeenkomst is aangegaan voor bepaalde tijd en vangt aan op ${startDatum} en eindigt op ${contractData?.einddatum || '[Einddatum]'} zonder dat opzegging vereist is.`
        : `Deze overeenkomst is aangegaan voor onbepaalde tijd en vangt aan op ${startDatum}.`
    },
    {
      number: 3,
      title: 'Proeftijd',
      content: contractData?.proeftijd 
        ? `Er geldt een proeftijd van ${contractData.proeftijd} maanden. Gedurende de proeftijd kan de arbeidsovereenkomst door beide partijen zonder opzegtermijn worden beëindigd.`
        : 'Er geldt geen proeftijd voor deze arbeidsovereenkomst.'
    },
    {
      number: 4,
      title: 'Arbeidsduur',
      content: `De overeengekomen arbeidsduur bedraagt ${employee.hours_per_week || '[Uren]'} uur per week. De werktijden worden in overleg met de werkgever vastgesteld.`
    },
    {
      number: 5,
      title: 'Salaris',
      content: contractData?.salaris
        ? `Het bruto maandsalaris bedraagt € ${contractData.salaris.toFixed(2)} bij een volledige werkweek. Dit salaris is exclusief vakantiegeld en andere toeslagen.`
        : 'Het salaris wordt overeengekomen volgens de geldende CAO of zoals nader overeengekomen.'
    },
    {
      number: 6,
      title: 'Vakantie',
      content: contractData?.vakantiedagen
        ? `De werknemer heeft recht op ${contractData.vakantiedagen} vakantiedagen per jaar bij een volledige werkweek.`
        : 'De werknemer heeft recht op het wettelijk minimum aantal vakantiedagen.'
    },
    {
      number: 7,
      title: 'Geheimhouding',
      content: 'De werknemer is verplicht tot geheimhouding van alle vertrouwelijke informatie die hij/zij tijdens de uitoefening van de werkzaamheden verkrijgt. Deze verplichting geldt ook na beëindiging van de arbeidsovereenkomst.'
    }
  ];

  articles.forEach(article => {
    page.drawText(`Artikel ${article.number}: ${article.title}`, { x: 50, y, size: 11, font: boldFont });
    y -= 20;
    const lines = splitText(article.content, 75);
    lines.forEach(line => {
      page.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    });
    y -= 20;
  });

  // Bijzondere bepalingen
  if (contractData?.bijzondereBepalingen) {
    page.drawText('Bijzondere Bepalingen:', { x: 50, y, size: 11, font: boldFont });
    y -= 20;
    const lines = splitText(contractData.bijzondereBepalingen, 75);
    lines.forEach(line => {
      page.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    });
    y -= 30;
  }

  // Ondertekening
  y -= 20;
  page.drawText('Aldus overeengekomen en ondertekend:', { x: 50, y, size: 10, font: boldFont });
  y -= 40;

  page.drawText('Werkgever:', { x: 50, y, size: 10, font: boldFont });
  page.drawText('Werknemer:', { x: 320, y, size: 10, font: boldFont });
  y -= 60;

  page.drawText('_____________________', { x: 50, y, size: 10, font });
  page.drawText('_____________________', { x: 320, y, size: 10, font });
  y -= 15;

  page.drawText(`Datum: ____________`, { x: 50, y, size: 10, font });
  page.drawText(`Datum: ____________`, { x: 320, y, size: 10, font });

  return pdfDoc.save();
}

/**
 * Generate NDA (Geheimhoudingsverklaring) PDF
 */
export async function generateNDA(
  employee: Employee,
  company: Company
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'GEHEIMHOUDINGSVERKLARING',
    'Non-Disclosure Agreement (NDA)'
  );

  let y = startY;

  // Intro
  const intro = `Ondergetekende, ${employee.voornaam} ${employee.achternaam}, werkzaam bij ${company.naam}, verklaart hierbij:`;
  page.drawText(intro, { x: 50, y, size: 10, font });
  y -= 30;

  const clauses = [
    'Alle informatie van ${company.naam} die niet publiek bekend is, als strikt vertrouwelijk te beschouwen.',
    'Deze vertrouwelijke informatie niet aan derden bekend te maken, noch tijdens noch na beëindiging van de arbeidsovereenkomst.',
    'Vertrouwelijke informatie alleen te gebruiken voor werkdoeleinden en niet voor persoonlijk gewin.',
    'Bij beëindiging van de arbeidsovereenkomst alle vertrouwelijke documenten, bestanden en materialen te retourneren of te vernietigen.',
    'Dat deze geheimhoudingsverplichting ook geldt voor informatie van klanten, leveranciers en partners van ${company.naam}.'
  ];

  clauses.forEach((clause, index) => {
    const text = `${index + 1}. ${clause.replace('${company.naam}', company.naam).replace('${company.naam}', company.naam)}`;
    const lines = splitText(text, 75);
    lines.forEach(line => {
      page.drawText(line, { x: 50, y, size: 10, font });
      y -= 15;
    });
    y -= 10;
  });

  y -= 20;
  page.drawText('Overtreding van deze geheimhoudingsverklaring kan leiden tot disciplinaire maatregelen,', { x: 50, y, size: 9, font });
  y -= 12;
  page.drawText('inclusief ontslag en mogelijke juridische stappen.', { x: 50, y, size: 9, font });
  y -= 40;

  // Ondertekening
  page.drawText('Aldus opgemaakt en ondertekend:', { x: 50, y, size: 10, font: boldFont });
  y -= 40;

  page.drawText('Naam:', { x: 50, y, size: 10, font: boldFont });
  page.drawText(`${employee.voornaam} ${employee.achternaam}`, { x: 120, y, size: 10, font });
  y -= 20;

  page.drawText('Datum:', { x: 50, y, size: 10, font: boldFont });
  page.drawText('______________', { x: 120, y, size: 10, font });
  y -= 30;

  page.drawText('Handtekening:', { x: 50, y, size: 10, font: boldFont });
  y -= 40;
  page.drawText('_____________________', { x: 50, y, size: 10, font });

  return pdfDoc.save();
}

/**
 * Generate Onboarding Checklist PDF
 */
export async function generateOnboardingChecklist(
  employee: Employee,
  company: Company,
  tasks?: Array<{ category: string; title: string; completed?: boolean }>
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'ONBOARDING CHECKLIST',
    `Voor ${employee.voornaam} ${employee.achternaam} - Start: ${employee.start_date ? format(new Date(employee.start_date), 'dd-MM-yyyy', { locale: nl }) : '[Startdatum]'}`
  );

  let y = startY;

  const defaultTasks = tasks || [
    { category: 'Administratie', title: 'Arbeidsovereenkomst ondertekend' },
    { category: 'Administratie', title: 'Personeelsdossier compleet' },
    { category: 'Administratie', title: 'Kopie identiteitsbewijs' },
    { category: 'IT & Toegang', title: 'E-mail account aangemaakt' },
    { category: 'IT & Toegang', title: 'Systemen toegang verleend' },
    { category: 'IT & Toegang', title: 'Laptop/apparatuur verstrekt' },
    { category: 'Werkplek', title: 'Werkplek ingericht' },
    { category: 'Werkplek', title: 'Toegangspas verstrekt' },
    { category: 'Introductie', title: 'Rondleiding gehad' },
    { category: 'Introductie', title: 'Voorgesteld aan team' },
    { category: 'Introductie', title: 'Kennismaking met manager' },
    { category: 'Training', title: 'Veiligheids instructie' },
    { category: 'Training', title: 'Systeem training gepland' },
    { category: 'Compliance', title: 'Geheimhoudingsverklaring ondertekend' },
    { category: 'Compliance', title: 'Arbeidsvoorwaarden doorgenomen' },
  ];

  // Group by category
  const byCategory: Record<string, typeof defaultTasks> = {};
  defaultTasks.forEach(task => {
    if (!byCategory[task.category]) byCategory[task.category] = [];
    byCategory[task.category].push(task);
  });

  Object.entries(byCategory).forEach(([category, items]) => {
    page.drawText(category, { x: 50, y, size: 12, font: boldFont, color: rgb(0.078, 0.722, 0.651) });
    y -= 20;

    items.forEach(item => {
      const checkbox = item.completed ? '[✓]' : '[ ]';
      page.drawText(checkbox, { x: 50, y, size: 10, font });
      page.drawText(item.title, { x: 75, y, size: 10, font });
      y -= 18;
    });

    y -= 15;
  });

  // Footer
  y -= 30;
  page.drawText('HR Manager:', { x: 50, y, size: 10, font: boldFont });
  page.drawText('_____________________', { x: 50, y - 30, size: 10, font });
  page.drawText(`Datum: ____________`, { x: 50, y - 45, size: 10, font });

  return pdfDoc.save();
}

/**
 * Generate Bewijs van Indiensttreding PDF
 */
export async function generateBewijsVanIndiensttreding(
  employee: Employee,
  company: Company
): Promise<Blob> {
  const { pdfDoc, page, font, boldFont, y: startY } = await createPDFWithHeader(
    'BEWIJS VAN INDIENSTTREDING',
    'Officieel document voor gemeente en instanties'
  );

  let y = startY;

  page.drawText('Hierbij verklaren wij dat:', { x: 50, y, size: 10, font: boldFont });
  y -= 30;

  const statements = [
    `${employee.voornaam} ${employee.achternaam}`,
    employee.date_of_birth ? `Geboren op ${format(new Date(employee.date_of_birth), 'dd MMMM yyyy', { locale: nl })}` : null,
    employee.address ? `Wonende te ${employee.address}, ${employee.postal_code || ''} ${employee.city || ''}` : null,
    '',
    `Per ${employee.start_date ? format(new Date(employee.start_date), 'dd MMMM yyyy', { locale: nl }) : '[Startdatum]'} in dienst is getreden bij:`,
    '',
    company.naam,
    company.adres || '',
    company.postcode && company.plaats ? `${company.postcode} ${company.plaats}` : '',
    company.kvk ? `KvK-nummer: ${company.kvk}` : '',
    '',
    `In de functie van: ${employee.functie || '[Functie]'}`,
    `Met een arbeidsomvang van ${employee.hours_per_week || '[Uren]'} uur per week`,
    employee.contract_type ? `Type contract: ${employee.contract_type}` : '',
  ].filter(Boolean);

  statements.forEach(statement => {
    if (statement === '') {
      y -= 15;
    } else {
      page.drawText(statement, { x: 50, y, size: 10, font });
      y -= 15;
    }
  });

  y -= 30;
  page.drawText('Dit document is afgegeven voor gebruik bij officiële instanties.', { x: 50, y, size: 9, font: boldFont });
  y -= 40;

  // Signature
  page.drawText('Namens de werkgever:', { x: 50, y, size: 10, font: boldFont });
  y -= 40;

  page.drawText('Naam: _____________________', { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText('Functie: _____________________', { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText(`Datum: ${format(new Date(), 'dd-MM-yyyy', { locale: nl })}`, { x: 50, y, size: 10, font });
  y -= 30;
  page.drawText('Handtekening en stempel:', { x: 50, y, size: 10, font });

  return pdfDoc.save();
}
