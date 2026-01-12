/**
 * InteractionDetailDialog Component
 * View and edit interaction details in a modal dialog
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Phone, Mail, Calendar, FileText, CheckSquare, Presentation, Pencil, Trash2, Check, X, Building2, User, Mailbox, Video } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useUpdateInteraction, useDeleteInteraction, type Interaction } from '../hooks/useInteractions';
import { useNavigate } from 'react-router-dom';
import { InteractionType, InteractionDirection, TaskStatus } from '@/types/crm';

interface InteractionDetailDialogProps {
  interaction: Interaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig = {
  call: { icon: Phone, label: 'Telefoongesprek', color: 'bg-blue-500' },
  email: { icon: Mail, label: 'E-mail', color: 'bg-purple-500' },
  meeting: { icon: Calendar, label: 'Vergadering', color: 'bg-green-500' },
  note: { icon: FileText, label: 'Notitie', color: 'bg-gray-500' },
  task: { icon: CheckSquare, label: 'Taak', color: 'bg-orange-500' },
  demo: { icon: Presentation, label: 'Demo', color: 'bg-pink-500' },
  physical_mail: { icon: Mailbox, label: 'Fysiek Kaartje', color: 'bg-pink-600' },
  linkedin_video_audit: { icon: Video, label: 'LinkedIn Video Audit', color: 'bg-red-500' },
  requirement_discussion: { icon: FileText, label: 'Requirements Discussie', color: 'bg-indigo-500' },
  quote_presentation: { icon: Presentation, label: 'Offerte Presentatie', color: 'bg-cyan-500' },
  review_session: { icon: CheckSquare, label: 'Review Sessie', color: 'bg-amber-500' },
  training: { icon: Calendar, label: 'Training', color: 'bg-emerald-500' },
};

const taskStatusConfig = {
  pending: { label: 'Te doen', color: 'bg-yellow-500' },
  completed: { label: 'Voltooid', color: 'bg-green-500' },
  cancelled: { label: 'Geannuleerd', color: 'bg-gray-500' },
};

export function InteractionDetailDialog({ interaction, open, onOpenChange }: InteractionDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  
  const updateMutation = useUpdateInteraction();
  const deleteMutation = useDeleteInteraction();

  const [formData, setFormData] = useState<{
    subject: string;
    description: string;
    type: InteractionType;
    direction: InteractionDirection;
    duration_minutes: number;
    scheduled_at: string;
    due_date: string;
    task_status: TaskStatus;
  }>({
    subject: '',
    description: '',
    type: 'call',
    direction: 'outbound',
    duration_minutes: 0,
    scheduled_at: '',
    due_date: '',
    task_status: 'pending',
  });

  // Update form data when interaction changes
  useState(() => {
    if (interaction && isEditing) {
      setFormData({
        subject: interaction.subject,
        description: interaction.description || '',
        type: interaction.type,
        direction: interaction.direction || 'outbound',
        duration_minutes: interaction.duration_minutes || 0,
        scheduled_at: interaction.scheduled_at || '',
        due_date: interaction.due_date || '',
        task_status: interaction.task_status || 'pending',
      });
    }
  });

  if (!interaction) return null;

  const config = typeConfig[interaction.type];
  const Icon = config.icon;

  const handleEdit = () => {
    setFormData({
      subject: interaction.subject,
      description: interaction.description || '',
      type: interaction.type,
      direction: interaction.direction || 'outbound',
      duration_minutes: interaction.duration_minutes || 0,
      scheduled_at: interaction.scheduled_at || '',
      due_date: interaction.due_date || '',
      task_status: interaction.task_status || 'pending',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: interaction.id,
      data: {
        subject: formData.subject,
        description: formData.description,
        type: formData.type,
        direction: formData.direction,
        duration_minutes: formData.duration_minutes || undefined,
        scheduled_at: formData.scheduled_at || undefined,
        due_date: formData.due_date || undefined,
        task_status: interaction.is_task ? formData.task_status : undefined,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(interaction.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  const handleMarkCompleted = async () => {
    await updateMutation.mutateAsync({
      id: interaction.id,
      data: {
        task_status: 'completed',
        completed_at: new Date().toISOString(),
      },
    });
  };

  const handleMarkCancelled = async () => {
    await updateMutation.mutateAsync({
      id: interaction.id,
      data: { task_status: 'cancelled' },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setIsEditing(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {isEditing ? 'Interactie bewerken' : interaction.subject}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{config.label}</Badge>
                    {interaction.is_task && interaction.task_status && (
                      <Badge className={taskStatusConfig[interaction.task_status].color}>
                        {taskStatusConfig[interaction.task_status].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {!isEditing && (
                <div className="flex items-center gap-2">
                  {interaction.is_task && interaction.task_status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleMarkCompleted}>
                        <Check className="h-4 w-4 mr-1" />
                        Voltooid
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleMarkCancelled}>
                        <X className="h-4 w-4 mr-1" />
                        Annuleren
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Bewerken
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!isEditing ? (
              // VIEW MODE
              <>
                {/* Company & Contact */}
                <div className="grid grid-cols-2 gap-4">
                  {interaction.company && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Bedrijf</Label>
                      <Button
                        variant="link"
                        className="h-auto p-0 font-normal"
                        onClick={() => navigate(`/companies/${interaction.company_id}`)}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        {interaction.company.name}
                      </Button>
                    </div>
                  )}
                  {interaction.contact && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Contact</Label>
                      <Button
                        variant="link"
                        className="h-auto p-0 font-normal"
                        onClick={() => navigate(`/contacts/${interaction.contact_id}`)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        {interaction.contact.first_name} {interaction.contact.last_name}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Description */}
                {interaction.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Beschrijving</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{interaction.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {interaction.direction && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Richting</Label>
                      <p className="mt-1 capitalize">{interaction.direction === 'inbound' ? 'Inkomend' : 'Uitgaand'}</p>
                    </div>
                  )}
                  {interaction.duration_minutes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Duur</Label>
                      <p className="mt-1">{interaction.duration_minutes} minuten</p>
                    </div>
                  )}
                  {interaction.scheduled_at && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Gepland op</Label>
                      <p className="mt-1">
                        {format(new Date(interaction.scheduled_at), 'PPp', { locale: nl })}
                      </p>
                    </div>
                  )}
                  {interaction.due_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Deadline</Label>
                      <p className="mt-1">
                        {format(new Date(interaction.due_date), 'PP', { locale: nl })}
                      </p>
                    </div>
                  )}
                  {interaction.completed_at && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Voltooid op</Label>
                      <p className="mt-1">
                        {format(new Date(interaction.completed_at), 'PP', { locale: nl })}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Aangemaakt</Label>
                    <p className="mt-1">
                      {format(new Date(interaction.created_at), 'PP', { locale: nl })}
                    </p>
                  </div>
                </div>

                {/* User */}
                {interaction.user && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Eigenaar</Label>
                    <p className="mt-1 text-sm">{interaction.user.voornaam} {interaction.user.achternaam}</p>
                  </div>
                )}
              </>
            ) : (
              // EDIT MODE
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Onderwerp *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Onderwerp van de interactie"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Telefoongesprek</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="meeting">Vergadering</SelectItem>
                      <SelectItem value="note">Notitie</SelectItem>
                      <SelectItem value="task">Taak</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Beschrijving</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Gedetailleerde beschrijving"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Richting</Label>
                    <Select value={formData.direction} onValueChange={(value: any) => setFormData({ ...formData, direction: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Inkomend</SelectItem>
                        <SelectItem value="outbound">Uitgaand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duur (minuten)</Label>
                    <Input
                      type="number"
                      value={formData.duration_minutes || ''}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      placeholder="30"
                    />
                  </div>
                </div>

                {interaction.is_task && (
                  <>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.task_status} onValueChange={(value: any) => setFormData({ ...formData, task_status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Te doen</SelectItem>
                          <SelectItem value="completed">Voltooid</SelectItem>
                          <SelectItem value="cancelled">Geannuleerd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input
                        type="date"
                        value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Gepland op</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at ? formData.scheduled_at.slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {isEditing && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interactie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{interaction.subject}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
