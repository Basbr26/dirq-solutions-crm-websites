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
import { DocumentCard } from '@/components/documents/DocumentCard';

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
        <Button variant="outline" onClick={() => navigate(`/hr/medewerkers/${id}/bewerken`)} className="gap-2">
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
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="gegevens" className="gap-2">
              <User className="h-4 w-4" />
              Gegevens
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Contract
            </TabsTrigger>
            <TabsTrigger value="verzuim" className="gap-2">
              <Heart className="h-4 w-4" />
              Verzuim
            </TabsTrigger>
            <TabsTrigger value="verlof" className="gap-2">
              <Calendar className="h-4 w-4" />
              Verlof
            </TabsTrigger>
            <TabsTrigger value="documenten" className="gap-2">
              <FileText className="h-4 w-4" />
              Documenten
            </TabsTrigger>
            <TabsTrigger value="notities" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Notities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gegevens" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Persoonlijke gegevens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Geboortedatum" value={formatDate(employee.date_of_birth)} />
                  <InfoRow label="E-mail" value={employee.email} />
                  <InfoRow label="Telefoon" value={employee.telefoon || '-'} />
                  <Separator />
                  <InfoRow label="Adres" value={employee.address || '-'} />
                  <InfoRow label="Postcode" value={employee.postal_code || '-'} />
                  <InfoRow label="Plaats" value={employee.city || '-'} />
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Noodcontact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Naam" value={employee.emergency_contact_name || '-'} />
                  <InfoRow label="Telefoon" value={employee.emergency_contact_phone || '-'} />
                </CardContent>
              </Card>

              {/* Bank Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Financieel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Bankrekening (IBAN)" value={employee.bank_account || '-'} />
                </CardContent>
              </Card>

              {/* Manager */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organisatie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Afdeling" value={employee.department?.name || '-'} />
                  <InfoRow 
                    label="Leidinggevende" 
                    value={employee.manager ? `${employee.manager.voornaam} ${employee.manager.achternaam}` : '-'} 
                  />
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
                  <UniversalDocumentGenerator 
                    employeeId={id!} 
                    onGenerated={loadEmployee}
                  />
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
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Notities module komt binnenkort...
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
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
