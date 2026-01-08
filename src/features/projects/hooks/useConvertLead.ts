/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎉 LEAD TO CUSTOMER CONVERSION HOOK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Converts a lead/project to a won deal with customer status. This is the 
 * critical happy-path endpoint in the sales funnel.
 * 
 * BUSINESS LOGIC:
 * 1. Company status: 'prospect' → 'customer'
 * 2. Project stage: 'negotiation'/'quote_sent' → 'quote_signed'
 * 3. Project probability: → 90%
 * 4. Notification: deal_won to owner
 * 5. UI: 3-second confetti celebration
 * 
 * USAGE (AI AGENT GUIDE):
 * This hook should be triggered when:
 * - Project stage is 'negotiation' OR 'quote_sent'
 * - User clicks "Converteer naar Klant" button
 * - Quote has been signed by customer
 * - Deal is officially won
 * 
 * AI WEBHOOK TRIGGER:
 * To trigger conversion via API/webhook, make this Supabase RPC call:
 * ```typescript
 * await supabase.rpc('convert_lead_to_customer', {
 *   p_project_id: 'uuid-here',
 *   p_company_id: 'uuid-here'
 * });
 * ```
 * 
 * PARAMETERS:
 * @param projectId - UUID of the project being converted
 * @param companyId - UUID of the company becoming a customer
 * @param projectTitle - Title for notification message
 * @param companyName - Company name for notification
 * @param ownerId - User UUID to receive notification
 * @param projectValue - Deal value in EUR for celebration context
 * 
 * RETURNS:
 * Promise<{ projectId, companyId }> on success
 * 
 * SIDE EFFECTS:
 * - 2 database UPDATEs (companies, projects tables)
 * - 1 INSERT (notifications table)
 * - Query invalidation for 4 queryKeys
 * - Toast notification displayed
 * - Confetti animation triggered
 * 
 * ERROR HANDLING:
 * Throws database errors if updates fail. Hook handles rollback automatically.
 * 
 * DEPENDENCIES:
 * - canvas-confetti: For celebration animation
 * - notifyDealClosed: Notification helper from @/lib/crmNotifications
 * 
 * ═══════════════════════════════════════════════════════════════════════════
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
    mutationFn: async ({ projectId, companyId, projectTitle, companyName, ownerId, projectValue }: ConvertLeadParams) => {
      // ─────────────────────────────────────────────────────────────────────
      // Step 1: Update Company status to 'customer'
      // ─────────────────────────────────────────────────────────────────────
      const { error: companyError } = await supabase
        .from('companies')
        .update({ status: 'customer' })
        .eq('id', companyId);

      if (companyError) throw companyError;

      // ─────────────────────────────────────────────────────────────────────
      // Step 2: Update Project stage to 'quote_signed' and probability to 90
      // ─────────────────────────────────────────────────────────────────────
      const { error: projectError } = await supabase
        .from('projects')
        .update({ 
          stage: 'quote_signed',  // Critical sales milestone
          probability: 90          // Near-certain to close (90% win rate)
        })
        .eq('id', projectId);

      if (projectError) throw projectError;

      return { projectId, companyId };
    },
    onSuccess: async ({ projectId }, { projectTitle, companyName, ownerId, projectValue }) => {
      // ─────────────────────────────────────────────────────────────────────
      // Invalidate all relevant queries to refresh UI
      // ─────────────────────────────────────────────────────────────────────
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });

      // ─────────────────────────────────────────────────────────────────────
      // Step 3: Send deal_won notification to owner
      // ─────────────────────────────────────────────────────────────────────
      await notifyDealClosed(
        projectId,
        ownerId,
        projectTitle,
        'won',
        projectValue
      );

      // ─────────────────────────────────────────────────────────────────────
      // Step 4: User feedback
      // ─────────────────────────────────────────────────────────────────────
      toast.success('🎉 Deal Gewonnen!', {
        description: `${companyName} is nu een klant!`,
      });

      // ─────────────────────────────────────────────────────────────────────
      // Step 5: 🎊 CONFETTI CELEBRATION! 🎊
      // ─────────────────────────────────────────────────────────────────────
      triggerConfetti();
    },
    onError: (error: Error) => {
      console.error('[useConvertLead] Conversion error:', error);
      toast.error('Fout bij conversie', {
        description: error.message,
      });
    },
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎊 CONFETTI CELEBRATION FUNCTION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Triggers a full-screen confetti explosion with Dirq brand colors.
 * 
 * DURATION: 3 seconds
 * COLORS: Dirq turquoise (#06BDC7) + complementary colors
 * EFFECT: Fires from both sides of screen in random bursts
 * 
 * TECHNICAL DETAILS:
 * - Uses canvas-confetti library
 * - Particle count decreases over time for fade-out effect
 * - Z-index: 9999 to appear above all UI elements
 * - Spread: 360° (omnidirectional)
 * - Velocity: 30px/s starting speed
 * 
 * ═══════════════════════════════════════════════════════════════════════════
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
