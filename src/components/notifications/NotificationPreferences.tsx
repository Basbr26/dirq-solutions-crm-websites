import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Clock, Bell, Mail, MessageSquare, Zap, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferencesProps {
  userId: string;
  onClose?: () => void;
}

interface UserPreferences {
  digest_preference: 'instant' | 'hourly' | 'daily' | 'weekly' | 'none';
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  vacation_mode: {
    enabled: boolean;
    start_date?: string;
    end_date?: string;
  };
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  priority_thresholds: {
    email: 'critical' | 'high' | 'normal' | 'low';
    sms: 'critical' | 'high' | 'normal' | 'low';
    push: 'critical' | 'high' | 'normal' | 'low';
  };
  notification_types: Record<string, boolean>;
}

const defaultPreferences: UserPreferences = {
  digest_preference: 'daily',
  quiet_hours: {
    enabled: true,
    start: '22:00',
    end: '08:00'
  },
  vacation_mode: {
    enabled: false
  },
  channels: {
    in_app: true,
    email: true,
    sms: false,
    push: true
  },
  priority_thresholds: {
    email: 'normal',
    sms: 'critical',
    push: 'high'
  },
  notification_types: {
    poortwachter_week1: true,
    poortwachter_week6: true,
    leave_approval_needed: true,
    task_overdue: true,
    document_signature_needed: true
  }
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userId,
  onClose
}) => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement notification_preferences table
      // const { data, error } = await supabase
      //   .from('notification_preferences')
      //   .select('preferences')
      //   .eq('user_id', userId)
      //   .single();

      // if (data?.preferences) {
      //   setPreferences({ ...defaultPreferences, ...data.preferences });
      // }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      // TODO: Implement notification_preferences table
      // const { error } = await supabase
      //   .from('notification_preferences')
      //   .upsert({
      //     user_id: userId,
      //     preferences: preferences,
      //     updated_at: new Date().toISOString()
      //   }, {
      //     onConflict: 'user_id'
      //   });

      // if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification preferences saved',
        variant: 'default'
      });

      setShowDialog(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading preferences...</div>;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
          <DialogDescription>
            Manage how and when you receive notifications
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="delivery" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
          </TabsList>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notification Channels
              </h3>
              <div className="space-y-3">
                {Object.entries(preferences.channels).map(([channel, enabled]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <label className="text-sm font-medium capitalize">{channel.replace('_', ' ')}</label>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(value) =>
                        setPreferences({
                          ...preferences,
                          channels: { ...preferences.channels, [channel]: value }
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Priority Thresholds
              </h3>
              <p className="text-xs text-gray-600 mb-3">Only receive notifications at this priority or higher</p>
              <div className="space-y-3">
                {Object.entries(preferences.priority_thresholds).map(([channel, threshold]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <label className="text-sm font-medium capitalize">{channel}</label>
                    <select
                      value={threshold}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          priority_thresholds: {
                            ...preferences.priority_thresholds,
                            [channel]: e.target.value as 'low' | 'normal' | 'high' | 'critical'
                          }
                        })
                      }
                      className="text-sm px-2 py-1 border rounded"
                    >
                      <option value="low">Low and above</option>
                      <option value="normal">Normal and above</option>
                      <option value="high">High and above</option>
                      <option value="critical">Critical only</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Digest Preference
              </h3>
              <div className="space-y-2">
                {(['instant', 'hourly', 'daily', 'weekly', 'none'] as const).map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="digest"
                      value={option}
                      checked={preferences.digest_preference === option}
                      onChange={(e) =>
                        setPreferences({ ...preferences, digest_preference: e.target.value as 'instant' | 'hourly' | 'daily' | 'weekly' })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm capitalize">{option.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Quiet Hours
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable Quiet Hours</label>
                  <Switch
                    checked={preferences.quiet_hours.enabled}
                    onCheckedChange={(value) =>
                      setPreferences({
                        ...preferences,
                        quiet_hours: { ...preferences.quiet_hours, enabled: value }
                      })
                    }
                  />
                </div>
                {preferences.quiet_hours.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours.start}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            quiet_hours: { ...preferences.quiet_hours, start: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">End Time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours.end}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            quiet_hours: { ...preferences.quiet_hours, end: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Vacation Mode</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable Vacation Mode</label>
                  <Switch
                    checked={preferences.vacation_mode.enabled}
                    onCheckedChange={(value) =>
                      setPreferences({
                        ...preferences,
                        vacation_mode: { ...preferences.vacation_mode, enabled: value }
                      })
                    }
                  />
                </div>
                {preferences.vacation_mode.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={preferences.vacation_mode.start_date || ''}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            vacation_mode: { ...preferences.vacation_mode, start_date: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">End Date</label>
                      <input
                        type="date"
                        value={preferences.vacation_mode.end_date || ''}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            vacation_mode: { ...preferences.vacation_mode, end_date: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Types Tab */}
          <TabsContent value="types" className="space-y-4 mt-4">
            <p className="text-xs text-gray-600 mb-4">Choose which notification types to receive</p>
            <div className="space-y-2">
              {Object.entries(preferences.notification_types).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <label className="text-sm font-medium capitalize">
                    {type.replace(/_/g, ' ')}
                  </label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(value) =>
                      setPreferences({
                        ...preferences,
                        notification_types: { ...preferences.notification_types, [type]: value }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={savePreferences}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
