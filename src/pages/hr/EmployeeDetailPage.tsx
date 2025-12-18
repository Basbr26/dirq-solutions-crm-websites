import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Clock,
  Heart,
  FileText,
  MessageSquare,
  User,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { UniversalDocumentGenerator } from '@/components/documents/UniversalDocumentGenerator';
import { EmployeeDocumentUpload } from '@/components/documents/EmployeeDocumentUpload';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { EditEmployeeDialog } from '@/components/employee/EditEmployeeDialog';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteDialog } from '@/components/notes/NoteDialog';
import { GenerateDocumentFromNotesDialog } from '@/components/notes/GenerateDocumentFromNotesDialog';
import { useEmployeeNotes, useNoteStats, useDeleteNote, useTogglePin, useCompleteFollowUp, type HRNote } from '@/hooks/useEmployeeNotes';
import { CATEGORIES, filterNotes, sortNotes, calculateNoteStats, getCategoryIcon } from '@/lib/notes/helpers';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Search, Pin, CheckSquare } from 'lucide-react';

interface EmployeeDetail {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string | null;
  functie: string | null;
  foto_url: string | null;
  department_id: string | null;
  manager_id: string | null;
  employee_number: string | null;
  date_of_birth: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_type: string | null;
  hours_per_week: number | null;
  employment_status: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_account: string | null;
  notes: string | null;
  department?: { name: string } | null;
  manager?: { voornaam: string; achternaam: string } | null;
}

interface SickLeaveCase {
  id: string;
  start_date: string;
  end_date: string | null;
  case_status: string;
  functional_limitations: string | null;
}

interface Document {
  id: string;
  title: string;
  document_type?: string;
  file_name: string;
  file_path: string;
  status: string;
  created_at: string;
  uploaded_by?: string;
  requires_signatures?: string[];
  owner_signed?: boolean;
}

function EmployeeDocuments({ 
  documents, 
  onRefresh 
}: { 
  documents: Document[];
  onRefresh: () => void;
}) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Geen documenten</h3>
        <p className="text-sm text-muted-foreground">
          Er zijn nog geen documenten voor deze medewerker.
          <br />
          Gebruik de knop hierboven om een document te genereren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onDelete={onRefresh}
        />
      ))}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [sickLeaveCases, setSickLeaveCases] = useState<SickLeaveCase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Notes state
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<HRNote | undefined>();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFollowUpsOnly, setShowFollowUpsOnly] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showGenerateDocDialog, setShowGenerateDocDialog] = useState(false);

  // Notes queries and mutations
  const { data: notes = [], isLoading: notesLoading } = useEmployeeNotes(id || '');
  const { data: noteStats } = useNoteStats(id || '');
  const deleteNoteMutation = useDeleteNote();
  const togglePinMutation = useTogglePin();
  const completeFollowUpMutation = useCompleteFollowUp();

  useEffect(() => {
    if (id) {
      loadEmployee();
    }
  }, [id]);

  const loadEmployee = async () => {
    if (!id) return;

    try {
      console.log('🔍 Loading employee with ID:', id);
      
      const [employeeResult, casesResult, documentsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, department:departments!profiles_department_id_fkey(name)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('sick_leave_cases')
          .select('*')
          .eq('employee_id', id)
          .order('start_date', { ascending: false }),
        supabase
          .from('documents')
          .select('*')
          .eq('employee_id', id)
          .order('created_at', { ascending: false }),
      ]);

      console.log('📊 Employee query result:', {
        data: employeeResult.data,
        error: employeeResult.error
      });
      console.log('📊 Cases query result:', {
        count: casesResult.data?.length || 0,
        error: casesResult.error
      });

      if (employeeResult.error) {
        console.error('❌ Employee query error:', employeeResult.error);
        throw employeeResult.error;
      }
      if (casesResult.error) {
        console.error('❌ Cases query error:', casesResult.error);
        throw casesResult.error;
      }

      if (!employeeResult.data) {
        console.warn('⚠️ No employee data found for ID:', id);
        toast.error('Medewerker niet gevonden');
        navigate('/hr/medewerkers');
        return;
      }

      // Fetch manager data separately if manager_id exists
      let managerData = null;
      if (employeeResult.data.manager_id) {
        const { data: manager } = await supabase
          .from('profiles')
          .select('id, voornaam, achternaam')
          .eq('id', employeeResult.data.manager_id)
          .single();
        managerData = manager;
      }

      const employeeData = {
        ...employeeResult.data,
        manager: managerData,
      };

      console.log('✅ Employee loaded successfully:', employeeData.voornaam, employeeData.achternaam);
      setEmployee(employeeData as EmployeeDetail);
      setSickLeaveCases(casesResult.data || []);
      setDocuments(documentsResult.data || []);
    } catch (error) {
      console.error('❌ Error loading employee:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toast.error(`Fout bij laden van medewerker: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'actief':
        return <Badge className="bg-success text-success-foreground">Actief</Badge>;
      case 'met_verlof':
        return <Badge variant="secondary">Met verlof</Badge>;
      case 'uit_dienst':
        return <Badge variant="outline" className="text-muted-foreground">Uit dienst</Badge>;
      case 'inactief':
        return <Badge variant="destructive">Inactief</Badge>;
      default:
        return <Badge variant="outline">Onbekend</Badge>;
    }
  };

  const getContractLabel = (type: string | null) => {
    switch (type) {
      case 'fulltime': return 'Voltijd';
      case 'parttime': return 'Deeltijd';
      case 'tijdelijk': return 'Tijdelijk';
      case 'oproep': return 'Oproep';
      case 'stage': return 'Stage';
      default: return 'Onbekend';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };

  if (loading) {
    return (
      <AppLayout title="Laden...">
        <div className="p-6 space-y-6">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return null;
  }

  const activeSickLeave = sickLeaveCases.find(c => c.case_status === 'actief');

  return (
    <AppLayout
      title={`${employee.voornaam} ${employee.achternaam}`}
      subtitle={employee.functie || undefined}
      actions={
        <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="gap-2">
          <Edit className="h-4 w-4" />
          Bewerken
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/hr/medewerkers')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Terug naar overzicht
        </Button>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarImage src={employee.foto_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl md:text-3xl font-semibold">
                  {employee.voornaam?.[0]}{employee.achternaam?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{employee.voornaam} {employee.achternaam}</h2>
                    <p className="text-muted-foreground">{employee.functie || 'Geen functie'}</p>
                    {employee.employee_number && (
                      <p className="text-sm text-muted-foreground">#{employee.employee_number}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(employee.employment_status)}
                    {activeSickLeave && (
                      <Badge variant="destructive" className="gap-1">
                        <Heart className="h-3 w-3" />
                        Ziek gemeld
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${employee.email}`} className="hover:text-primary">{employee.email}</a>
                  </div>
                  {employee.telefoon && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${employee.telefoon}`} className="hover:text-primary">{employee.telefoon}</a>
                    </div>
                  )}
                  {employee.department?.name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{employee.department.name}</span>
                    </div>
                  )}
                  {employee.start_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>In dienst sinds {formatDate(employee.start_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="gegevens" className="space-y-6">
          <TabsList className="w-full justify-start tabs-list-scrollable">
            <TabsTrigger value="gegevens" className="gap-2 flex-shrink-0">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Gegevens</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-2 flex-shrink-0">
              <Briefcase className="h-4 w-4" />
              Contract
            </TabsTrigger>
            <TabsTrigger value="verzuim" className="gap-2 flex-shrink-0">
              <Heart className="h-4 w-4" />
              Verzuim
            </TabsTrigger>
            <TabsTrigger value="verlof" className="gap-2 flex-shrink-0">
              <Calendar className="h-4 w-4" />
              Verlof
            </TabsTrigger>
            <TabsTrigger value="documenten" className="gap-2 flex-shrink-0">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documenten</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="notities" className="gap-2 flex-shrink-0">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Notities</span>
              <span className="sm:hidden">Notes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gegevens" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Persoonlijke gegevens
                  </CardTitle>
                  <CardDescription>Basis informatie van de medewerker</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Volledige naam</p>
                        <p className="font-medium">{employee.voornaam} {employee.achternaam}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Geboortedatum</p>
                        <p className="font-medium">{formatDate(employee.date_of_birth)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <a href={`mailto:${employee.email}`} className="font-medium text-primary hover:underline">
                          {employee.email}
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Telefoon</p>
                        {employee.telefoon ? (
                          <a href={`tel:${employee.telefoon}`} className="font-medium text-primary hover:underline">
                            {employee.telefoon}
                          </a>
                        ) : (
                          <p className="font-medium text-muted-foreground">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Adresgegevens
                  </CardTitle>
                  <CardDescription>Woonadres van de medewerker</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Straat + huisnummer</p>
                        <p className="font-medium">{employee.address || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <p className="text-sm text-muted-foreground">Postcode</p>
                        <p className="font-medium">{employee.postal_code || '-'}</p>
                      </div>
                      
                      <div className="flex flex-col">
                        <p className="text-sm text-muted-foreground">Plaats</p>
                        <p className="font-medium">{employee.city || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Werkgegevens
                  </CardTitle>
                  <CardDescription>Functie en organisatie informatie</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Functie</p>
                        <p className="font-medium">{employee.functie || '-'}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Afdeling</p>
                        <p className="font-medium">{employee.department?.name || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Leidinggevende</p>
                        <p className="font-medium">
                          {employee.manager ? `${employee.manager.voornaam} ${employee.manager.achternaam}` : '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Personeelsnummer</p>
                        <p className="font-medium">{employee.employee_number || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Noodcontact
                  </CardTitle>
                  <CardDescription>Te bereiken in geval van nood</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Naam</p>
                        <p className="font-medium">{employee.emergency_contact_name || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Telefoon</p>
                        {employee.emergency_contact_phone ? (
                          <a href={`tel:${employee.emergency_contact_phone}`} className="font-medium text-red-600 hover:underline">
                            {employee.emergency_contact_phone}
                          </a>
                        ) : (
                          <p className="font-medium text-muted-foreground">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contract" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contractgegevens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <InfoRow label="Personeelsnummer" value={employee.employee_number || '-'} />
                  <InfoRow label="Contracttype" value={getContractLabel(employee.contract_type)} />
                  <InfoRow label="Uren per week" value={employee.hours_per_week ? `${employee.hours_per_week} uur` : '-'} />
                  <InfoRow label="In dienst sinds" value={formatDate(employee.start_date)} />
                  <InfoRow label="Uit dienst per" value={formatDate(employee.end_date)} />
                  <InfoRow label="Status" value={employee.employment_status || '-'} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verzuim" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verzuimhistorie</CardTitle>
                <CardDescription>{sickLeaveCases.length} verzuimmeldingen</CardDescription>
              </CardHeader>
              <CardContent>
                {sickLeaveCases.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Geen verzuimmeldingen</p>
                ) : (
                  <div className="space-y-4">
                    {sickLeaveCases.map((case_) => (
                      <div 
                        key={case_.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/case/${case_.id}`)}
                      >
                        <div>
                          <p className="font-medium">
                            {formatDate(case_.start_date)} - {case_.end_date ? formatDate(case_.end_date) : 'heden'}
                          </p>
                          <p className="text-sm text-muted-foreground">{case_.functional_limitations || 'Geen details'}</p>
                        </div>
                        <Badge variant={case_.case_status === 'actief' ? 'destructive' : 'secondary'}>
                          {case_.case_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verlof" className="space-y-6">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Verlofbeheer module komt binnenkort...
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documenten" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Documenten</CardTitle>
                    <CardDescription>
                      Beheer documenten voor deze medewerker
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <EmployeeDocumentUpload 
                      employeeId={id!}
                      onUploaded={loadEmployee}
                    />
                    <UniversalDocumentGenerator 
                      employeeId={id!} 
                      onGenerated={loadEmployee}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <EmployeeDocuments 
                  documents={documents} 
                  onRefresh={loadEmployee} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notities" className="space-y-6">
            {/* Header with create button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">HR Notities</h2>
                <p className="text-muted-foreground">
                  Privé notities over {employee?.voornaam} - Alleen zichtbaar voor HR en managers
                </p>
              </div>
              <div className="flex gap-2">
                {notes.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGenerateDocDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Genereer document
                  </Button>
                )}
                <Button onClick={() => {
                  setSelectedNote(undefined);
                  setShowNoteDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe notitie
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Categorie</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle categorieën</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Zoeken</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Zoek in titel of content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-8">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="follow-ups"
                        checked={showFollowUpsOnly}
                        onCheckedChange={(checked) => setShowFollowUpsOnly(checked as boolean)}
                      />
                      <Label htmlFor="follow-ups" className="font-normal cursor-pointer">
                        <CheckSquare className="h-4 w-4 inline mr-1" />
                        Alleen follow-ups
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-3 pt-8">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pinned"
                        checked={showPinnedOnly}
                        onCheckedChange={(checked) => setShowPinnedOnly(checked as boolean)}
                      />
                      <Label htmlFor="pinned" className="font-normal cursor-pointer">
                        <Pin className="h-4 w-4 inline mr-1" />
                        Alleen vastgepind
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            {noteStats && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Totaal notities</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{noteStats.total_notes || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Openstaande follow-ups</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{noteStats.pending_follow_ups || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Laatste 30 dagen</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{noteStats.last_30_days || 0}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notes Timeline */}
            <div className="space-y-4">
              {notesLoading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Notities laden...
                  </CardContent>
                </Card>
              ) : (() => {
                const filteredNotes = filterNotes(notes, {
                  search: searchQuery,
                  category: categoryFilter === 'all' ? undefined : categoryFilter,
                  followUpsOnly: showFollowUpsOnly,
                  pinnedOnly: showPinnedOnly,
                });
                const sortedNotes = sortNotes(filteredNotes);

                if (sortedNotes.length === 0) {
                  return (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {notes.length === 0
                            ? 'Nog geen notities. Klik op "Nieuwe notitie" om te beginnen.'
                            : 'Geen notities gevonden met de huidige filters.'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <>
                    {sortedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onEdit={() => {
                          setSelectedNote(note);
                          setShowNoteDialog(true);
                        }}
                        onDelete={(id) => {
                          deleteNoteMutation.mutate(id);
                        }}
                        onPin={(id) => {
                          togglePinMutation.mutate(id);
                        }}
                        onFollowUpComplete={(id) => {
                          completeFollowUpMutation.mutate(id);
                        }}
                      />
                    ))}
                  </>
                );
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      {employee && (
        <EditEmployeeDialog
          employee={employee}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadEmployee}
        />
      )}

      {/* Note Dialog */}
      {id && (
        <NoteDialog
          employeeId={id}
          note={selectedNote}
          open={showNoteDialog}
          onOpenChange={setShowNoteDialog}
        />
      )}

      {/* Generate Document from Notes Dialog */}
      {id && (
        <GenerateDocumentFromNotesDialog
          employeeId={id}
          notes={notes}
          open={showGenerateDocDialog}
          onOpenChange={setShowGenerateDocDialog}
        />
      )}
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
