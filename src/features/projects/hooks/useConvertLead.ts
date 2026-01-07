/**
 * Lead to Customer Conversion Hook
 * Handles the conversion of a lead/project to a won deal with customer status
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyDealClosed } from '@/lib/crmNotifications';
import confetti from 'canvas-confetti';

interface ConvertLeadParams {
  projectId: string;
  companyId: string;
  projectTitle: string;
  companyName: string;
  ownerId: string;
  projectValue: number;
}

export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, companyId }: ConvertLeadParams) => {
      // Step 1: Update Company status to 'customer'
      const { error: companyError } = await supabase
        .from('companies')
        .update({ status: 'customer' })
        .eq('id', companyId);

      if (companyError) throw companyError;

      // Step 2: Update Project stage to 'quote_signed' and probability to 90
      const { error: projectError } = await supabase
        .from('projects')
        .update({ 
          stage: 'quote_signed',
          probability: 90
        })
        .eq('id', projectId);

      if (projectError) throw projectError;

      return { projectId, companyId };
    },
    onSuccess: async ({ projectId }, { projectTitle, companyName, ownerId }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });

      // Step 3: Send deal_won notification
      await notifyDealClosed(
        projectId,
        ownerId,
        projectTitle,
        'won',
        projectValue
      );

      // Success toast
      toast.success('🎉 Deal Gewonnen!', {
        description: `${companyName} is nu een klant!`,
      });

      // 🎊 CONFETTI CELEBRATION! 🎊
      triggerConfetti();
    },
    onError: (error: Error) => {
      console.error('Conversion error:', error);
      toast.error('Fout bij conversie', {
        description: error.message,
      });
    },
  });
}

/**
 * Trigger a full-screen confetti explosion with Dirq turquoise colors
 */
function triggerConfetti() {
  const duration = 3000; // 3 seconds
  const animationEnd = Date.now() + duration;
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 9999,
    colors: ['#06BDC7', '#0ea5e9', '#10b981', '#34d399', '#60a5fa'] // Dirq turquoise + complementary colors
  };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Fire confetti from both sides
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}
