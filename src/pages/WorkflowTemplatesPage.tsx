import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { workflowTemplates, searchTemplates, getTemplatesByCategory } from '@/data/workflowTemplates';
import {
  Search,
  UserPlus,
  FileText,
  Heart,
  UserMinus,
  ClipboardCheck,
  Calendar,
  Workflow,
  Copy,
  Eye,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const categoryIcons: Record<string, React.ElementType> = {
  onboarding: UserPlus,
  offboarding: UserMinus,
  verzuim: Heart,
  contract: FileText,
  performance: ClipboardCheck,
  other: Calendar,
};

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  verzuim: 'Verzuim',
  contract: 'Contracten',
  performance: 'Performance',
  other: 'Overig',
};

export default function WorkflowTemplatesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : selectedCategory === 'all'
    ? workflowTemplates
    : getTemplatesByCategory(selectedCategory);

  const handleUseTemplate = (templateId: string) => {
    // Navigeer naar workflow builder met template ID
    navigate(`/workflows/builder?template=${templateId}`);
    toast.success('Template geladen in workflow builder');
  };

  const handlePreviewTemplate = (templateId: string) => {
    // Toon template preview (kan later uitgebreid worden met modal)
    toast.info('Preview functionaliteit komt binnenkort');
  };

  const categories = Array.from(new Set(workflowTemplates.map((t) => t.category)));

  return (
    <AppLayout
      title="Workflow Templates"
      subtitle="Kies een template om snel workflows te maken"
      actions={
        <Button onClick={() => navigate('/workflows/builder')} className="gap-2">
          <Workflow className="h-4 w-4" />
          <span className="hidden sm:inline">Lege workflow maken</span>
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Hero Section */}
        <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Workflow Templates</h2>
                <p className="text-muted-foreground">
                  Bespaar tijd met voorgedefinieerde workflows voor veelvoorkomende HR processen. Kies een
                  template, pas aan naar jouw wensen en activeer!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs voor categorieën */}
        <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">
              Alle ({workflowTemplates.length})
            </TabsTrigger>
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              const count = getTemplatesByCategory(category).length;
              return (
                <TabsTrigger key={category} value={category} className="gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {categoryLabels[category]} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {/* Templates Grid */}
            {filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? `Geen templates gevonden voor "${searchQuery}"`
                      : 'Geen templates beschikbaar in deze categorie'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => {
                  const Icon = categoryIcons[template.category];
                  return (
                    <Card
                      key={template.id}
                      className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            {Icon && <Icon className="h-5 w-5 text-primary" />}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {categoryLabels[template.category]}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{template.definition.nodes.length} stappen</span>
                          {template.usage_count > 0 && (
                            <span>{template.usage_count}x gebruikt</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleUseTemplate(template.id)}
                            className="flex-1 gap-2"
                            size="sm"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Gebruiken
                          </Button>
                          <Button
                            onClick={() => handlePreviewTemplate(template.id)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" />
              Hoe werken templates?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Kies een template die past bij je proces</li>
              <li>✓ Template wordt geladen in de workflow builder</li>
              <li>✓ Pas de workflow aan naar je eigen behoeften</li>
              <li>✓ Sla op en activeer de workflow</li>
              <li>✓ De workflow wordt automatisch uitgevoerd bij de juiste trigger</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
