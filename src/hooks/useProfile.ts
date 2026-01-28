import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  full_name: string;
  updated_at: string;
}

/**
 * Fetch user profile data by user ID
 * 
 * @param userId - The user ID to fetch profile for
 * @returns React Query result with profile data
 * 
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useProfile(user?.id);
 * if (profile) {
 *   console.log(profile.full_name);
 * }
 * ```
 */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}

/**
 * Update user profile information
 * Automatically updates full_name field from first_name and last_name.
 * Invalidates profile query cache on success.
 * 
 * @returns React Query mutation for updating profile
 * 
 * @example
 * ```tsx
 * const updateProfile = useUpdateProfile();
 * 
 * const handleSubmit = (formData) => {
 *   updateProfile.mutate(
 *     { userId: user.id, data: formData },
 *     {
 *       onSuccess: () => toast.success('Profile updated'),
 *       onError: (error) => toast.error(error.message)
 *     }
 *   );
 * };
 * ```
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: ProfileUpdateData }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          full_name: `${data.first_name} ${data.last_name}`,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file, oldAvatarUrl }: { userId: string; file: File; oldAvatarUrl?: string }) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Upload alleen afbeeldingen (JPG, PNG, GIF, WebP)');
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Maximale bestandsgrootte is 2MB');
      }

      // Delete old avatar if exists
      if (oldAvatarUrl) {
        const oldPath = oldAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Get public URL and ensure it has proper protocol
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Fix: Ensure URL has https:// protocol
      const fullPublicUrl = publicUrl.startsWith('http') 
        ? publicUrl 
        : `https://${publicUrl.replace(/^\/+/, '')}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fullPublicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      return fullPublicUrl;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, avatarUrl }: { userId: string; avatarUrl: string }) => {
      // Delete from storage
      const avatarPath = avatarUrl.split('/avatars/')[1];
      if (avatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
