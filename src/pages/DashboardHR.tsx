import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ZiekmeldingDialog } from '@/components/ZiekmeldingDialog';
import { CaseCard } from '@/components/CaseCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { mockSickLeaveCases } from '@/lib/mockData';
import { SickLeaveCase, CaseStatus } from '@/types/sickLeave';
import { Search, TrendingUp, Users, Clock } from 'lucide-react';

export default function DashboardHR() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<SickLeaveCase[]>(mockSickLeaveCases);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');

  const handleNewCase = (data: any) => {
    const newCase: SickLeaveCase = {
      id: `case-${Date.now()}`,
      medewerker_id: `emp-${Date.now()}`,
      medewerker_naam: data.medewerker_naam,
      start_datum: data.start_datum,
      eind_datum: null,
      reden: data.reden,
      status: 'actief',
      manager_id: null,
      notities: data.notities || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCases([newCase, ...cases]);
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.medewerker_naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.reden.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cases.length,
    actief: cases.filter(c => c.status === 'actief').length,
    herstel: cases.filter(c => c.status === 'herstel').length,
    afgesloten: cases.filter(c => c.status === 'afgesloten').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="HR Dashboard" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Verzuimdossiers</h1>
            <p className="text-muted-foreground">
              Overzicht van alle verzuimcases
            </p>
          </div>
          <ZiekmeldingDialog onSubmit={handleNewCase} />
        </div>

        {/* Statistieken */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totaal</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actief</p>
                  <p className="text-2xl font-bold">{stats.actief}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Herstel</p>
                  <p className="text-2xl font-bold">{stats.herstel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afgesloten</p>
                  <p className="text-2xl font-bold">{stats.afgesloten}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of reden..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatus | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="actief">Actief</SelectItem>
              <SelectItem value="herstel">Herstel</SelectItem>
              <SelectItem value="afgesloten">Afgesloten</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cases Grid */}
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Geen cases gevonden met deze filters'
                  : 'Nog geen ziekmeldingen geregistreerd'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCases.map((case_) => (
              <CaseCard
                key={case_.id}
                case_={case_}
                onClick={() => navigate(`/case/${case_.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
