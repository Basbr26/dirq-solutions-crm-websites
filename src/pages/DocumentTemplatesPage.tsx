/**
 * Document Templates Page
 * Gallery of available CRM document templates
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Receipt, Briefcase, Shield, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CRMDocumentGenerator } from '@/components/documents/CRMDocumentGenerator';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';

const templates = [
  {
    id: 'contract',
    name: 'Contract',
    description: 'Overeenkomst van opdracht voor projecten en dienstverlening',
    icon: FileText,
    category: 'Legal',
    color: 'bg-blue-500',
    features: [
      'Partijen en contactgegevens',
      'Projectomschrijving en deliverables',
      'Looptijd en vergoeding',
      'Handtekening blokken',
    ],
  },
  {
    id: 'invoice',
    name: 'Factuur',
    description: 'Professionele factuur met BTW berekening',
    icon: Receipt,
    category: 'Finance',
    color: 'bg-green-500',
    features: [
      'Automatische BTW berekening',
      'Meerdere factuurregels',
      'Betaalgegevens en IBAN',
      'Vervaldatum tracking',
    ],
  },
  {
    id: 'proposal',
    name: 'Projectvoorstel',
    description: 'Uitgebreid projectvoorstel met planning en investering',
    icon: Briefcase,
    category: 'Sales',
    color: 'bg-purple-500',
    features: [
      'Executive summary',
      'Doelstellingen en aanpak',
      'Tijdlijn met fases',
      'Investeringsoverzicht',
    ],
  },
  {
    id: 'nda',
    name: 'Geheimhoudingsovereenkomst',
    description: 'NDA voor vertrouwelijke klantprojecten',
    icon: Shield,
    category: 'Legal',
    color: 'bg-red-500',
    features: [
      'Definitie vertrouwelijke informatie',
      'Verplichtingen beide partijen',
      'Looptijd configureerbaar',
      'Handtekening blokken',
    ],
  },
  {
    id: 'meeting_notes',
    name: 'Gespreksverslag',
    description: 'Professionele meeting notities en actiepunten',
    icon: MessageSquare,
    category: 'Project',
    color: 'bg-amber-500',
    features: [
      'Agenda en aanwezigen',
      'Besluiten documenteren',
      'Actiepunten met eigenaar',
      'Follow-up planning',
    ],
  },
];

export default function DocumentTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <AppLayout
      title="Document Templates"
      subtitle="Professionele CRM documenten genereren voor contracten, facturen, voorstellen en meer"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Beschikbare Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorieën
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(templates.map((t) => t.category)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter((t) => t.category === 'Legal').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter((t) => t.category === 'Finance').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className={`${template.color} p-3 rounded-lg text-white mb-4`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Kenmerken:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {template.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <CRMDocumentGenerator 
                    defaultType={template.id as any}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Hoe te gebruiken</CardTitle>
          <CardDescription>
            Stappen om professionele documenten te genereren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start">
              <span className="font-bold mr-3 text-primary">1.</span>
              <div>
                <strong>Kies een template</strong> - Selecteer het type document dat je wilt
                genereren (contract, factuur, etc.)
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-3 text-primary">2.</span>
              <div>
                <strong>Vul gegevens in</strong> - Vul alle benodigde informatie in het
                formulier (bedrijfsnaam, klant, bedragen, etc.)
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-3 text-primary">3.</span>
              <div>
                <strong>Genereer document</strong> - Klik op 'Genereer Document' om een PDF
                preview te maken
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-3 text-primary">4.</span>
              <div>
                <strong>Download of opslaan</strong> - Download het document of sla het op in
                je document bibliotheek
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">💡 Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
          <p>
            • Documenten worden automatisch voorzien van Dirq branding en huisstijl
          </p>
          <p>
            • Gebruik duidelijke omschrijvingen voor een professionele uitstraling
          </p>
          <p>
            • Bewaar belangrijke documenten in je document bibliotheek voor later gebruik
          </p>
          <p>
            • Documenten kunnen gekoppeld worden aan bedrijven, contacten en projecten
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
