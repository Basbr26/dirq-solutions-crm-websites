/**
 * Demo Page for AI Document Processing
 * Shows SmartDocumentUpload and DocumentSearch components
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { SmartDocumentUpload } from '@/components/documents/SmartDocumentUpload';
import { DocumentSearch } from '@/components/documents/DocumentSearch';
import { DocumentList } from '@/components/DocumentList';
import { FileText, Upload, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DocumentProcessing() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  return (
    <AppLayout
      title="Document Beheer"
      subtitle="Upload offertes, contracten en projectdocumenten voor automatische analyse"
    >
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Uploaden
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Zoeken
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Alle Documenten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <SmartDocumentUpload
            onUploadComplete={(docId) => {
              console.log('Document uploaded:', docId);
              setSelectedDocumentId(docId);
            }}
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <DocumentSearch
            onDocumentSelect={(docId) => {
              console.log('Document selected:', docId);
              setSelectedDocumentId(docId);
            }}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card className="p-6">
            <DocumentList documents={[]} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">🤖 AI-Powered Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Documenten worden automatisch gecategoriseerd met behulp van machine learning en
            natuurlijke taalverwerking.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-2">📄 OCR Technology</h3>
          <p className="text-sm text-muted-foreground">
            Tesseract.js extraheert tekst uit afbeeldingen en gescande documenten met
            hoge nauwkeurigheid.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-2">🔒 Privacy & Security</h3>
          <p className="text-sm text-muted-foreground">
            Alle documenten worden versleuteld opgeslagen en voorzien van audit logging
            voor compliance.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
