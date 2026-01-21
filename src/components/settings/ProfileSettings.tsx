import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfile, useUploadAvatar, useDeleteAvatar } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';

export function ProfileSettings() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    updateProfile.mutate(
      { 
        userId: user.id, 
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        }
      },
      {
        onSuccess: () => {
          toast.success(t('success.profileUpdated'), {
            description: t('success.profileUpdatedDescription'),
          });
        },
        onError: (error: Error) => {
          toast.error(t('errors.saveFailed'), {
            description: error.message,
          });
        },
      }
    );
  };

  const getInitials = () => {
    const first = formData.first_name?.charAt(0) || '';
    const last = formData.last_name?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    uploadAvatar.mutate(
      { 
        userId: user.id, 
        file,
        oldAvatarUrl: formData.avatar_url || undefined,
      },
      {
        onSuccess: (publicUrl) => {
          setFormData({ ...formData, avatar_url: publicUrl });
          toast.success(t('success.avatarUpdated'), {
            description: t('success.avatarUpdatedDescription'),
          });
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        onError: (error: Error) => {
          toast.error(t('errors.uploadFailed'), {
            description: error.message,
          });
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
      }
    );
  };

  const handleRemoveAvatar = async () => {
    if (!user || !formData.avatar_url) return;

    deleteAvatar.mutate(
      { userId: user.id, avatarUrl: formData.avatar_url },
      {
        onSuccess: () => {
          setFormData({ ...formData, avatar_url: '' });
          toast.success(t('success.avatarRemoved'), {
            description: t('success.avatarRemovedDescription'),
          });
        },
        onError: (error: Error) => {
          toast.error(t('errors.deleteFailed'), {
            description: error.message,
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.profile.title')}</CardTitle>
        <CardDescription>
          {t('settings.profile.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              {formData.avatar_url && !uploadAvatar.isPending && !deleteAvatar.isPending && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveAvatar}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAvatarClick}
                disabled={uploadAvatar.isPending || deleteAvatar.isPending}
              >
                {uploadAvatar.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('settings.profile.uploadPhoto')}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('settings.profile.photoRequirements')}
              </p>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('common.firstName')}</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t('common.lastName')}</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.profile.emailCannotChange')}
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t('common.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+31 6 12345678"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
