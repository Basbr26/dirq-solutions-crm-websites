/**
 * Escalation Engine
 * Automatic escalation of notifications based on rules and timers
 * Enhanced with smart routing and deadline tracking
 */

import { supabase } from '@/integrations/supabase/client';
import { safeFrom } from '@/lib/supabaseTypeHelpers';
import { NotificationRouter } from './router';
import { differenceInHours, differenceInDays } from 'date-fns';
import type {
  NotificationRule,
  EscalationStep,
  CreateNotificationParams,
} from '@/types/notifications';
import type { NotificationAction } from './types';
import type { EscalationRule, Escalation, Notification } from './types';

export class EscalationEngine {
  /**
   * Process all pending escalations
   * Should be called periodically (e.g., every hour by Edge Function)
   */
  static async processEscalations(): Promise<number> {
    let escalationsProcessed = 0;

    // Get all active rules
    const { data: rules, error } = await safeFrom(supabase, 'notification_rules')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Error fetching rules:', error);
      return 0;
    }

    for (const rule of rules) {
      const processed = await this.processRule(rule);
      escalationsProcessed += processed;
    }

    return escalationsProcessed;
  }

  /**
   * Process a specific escalation rule
   */
  private static async processRule(rule: NotificationRule): Promise<number> {
    let escalated = 0;

    // Find entities that match this rule's conditions
    const entities = await this.findMatchingEntities(rule);

    for (const entity of entities) {
      // Check if escalation is needed
      const escalationNeeded = await this.checkEscalationNeeded(entity, rule);

      if (escalationNeeded) {
        await this.escalate(entity, rule);
        escalated++;
      }
    }

    return escalated;
  }

  /**
   * Find entities matching rule conditions
   */
  private static async findMatchingEntities(rule: NotificationRule): Promise<unknown[]> {
    const { entity_type, trigger_event } = rule;

    switch (entity_type) {
      case 'task':
        return await this.findTasksForEscalation(trigger_event);
      case 'approval':
        return await this.findApprovalsForEscalation(trigger_event);
      case 'case':
        return await this.findCasesForEscalation(trigger_event);
      case 'employee':
        return await this.findEmployeesForEscalation(trigger_event);
      default:
        return [];
    }
  }

  /**
   * Find tasks requiring escalation
   */
  private static async findTasksForEscalation(event: string): Promise<unknown[]> {
    let query = supabase
      .from('tasks')
      .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(id, voornaam, achternaam, role, manager_id)');

    if (event === 'overdue') {
      query = query
        .lt('deadline', new Date().toISOString())
        .neq('task_status', 'afgerond');
    } else if (event === 'deadline_approaching') {
      const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      query = query
        .lte('deadline', in24Hours)
        .gte('deadline', new Date().toISOString())
        .neq('task_status', 'afgerond');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error finding tasks:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Find approvals requiring escalation
   */
  private static async findApprovalsForEscalation(event: string): Promise<unknown[]> {
    if (event !== 'pending') return [];

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, employee:profiles!leave_requests_employee_id_fkey(id, voornaam, achternaam, manager_id)')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error finding approvals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Find cases requiring escalation
   */
  private static async findCasesForEscalation(event: string): Promise<unknown[]> {
    if (event !== 'deadline_approaching') return [];

    // Find cases approaching Wet Poortwachter deadlines
    const { data, error } = await supabase
      .from('sick_leave_cases')
      .select('*, employee:profiles!sick_leave_cases_employee_id_fkey(id, voornaam, achternaam, manager_id)')
      .eq('case_status', 'actief');

    if (error) {
      console.error('Error finding cases:', error);
      return [];
    }

    // Filter for cases approaching critical deadlines (Week 6, Week 42)
    return (data || []).filter((caseItem) => {
      const startDate = new Date(caseItem.start_date);
      const weeksElapsed = Math.floor(
        (Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      // Week 6 deadline approaching (5 weeks)
      if (weeksElapsed === 5) return true;

      // Week 42 deadline approaching (41 weeks)
      if (weeksElapsed === 41) return true;

      return false;
    });
  }

  /**
   * Find employees requiring notification (e.g., contract expiry)
   */
  private static async findEmployeesForEscalation(event: string): Promise<unknown[]> {
    if (event !== 'contract_expiring') return [];

    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('employment_status', 'actief')
      .not('end_date', 'is', null)
      .lte('end_date', in90Days);

    if (error) {
      console.error('Error finding employees:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if escalation is needed for entity
   */
  private static async checkEscalationNeeded(
    _entity: unknown,
    _rule: NotificationRule
  ): Promise<boolean> {
    // escalation_history table doesn't exist yet
    // Always return true for now
    return true;
  }

  /**
   * Execute escalation
   */
  private static async escalate(entity: unknown, rule: NotificationRule): Promise<void> {
    const entityRecord = entity as Record<string, unknown>;
    const escalationChain = rule.escalation_chain as EscalationStep[];

    // escalation_history table doesn't exist yet, start from level 0
    const nextLevel = 0;

    if (nextLevel >= escalationChain.length) {
      // Max escalation level reached
      return;
    }

    const step = escalationChain[nextLevel];

    // Find target user(s) to escalate to
    const targetUsers = await this.findEscalationTargets(entityRecord, step);

    for (const targetUserId of targetUsers) {
      // Create escalation notification
      const notification: CreateNotificationParams = {
        user_id: targetUserId,
        title: `Escalatie: ${this.getEntityTitle(entityRecord, rule.entity_type)}`,
        message: this.getEscalationMessage(entityRecord, rule, nextLevel),
        type: 'escalation',
        metadata: {
          is_critical: nextLevel >= 2,
          legal_compliance: rule.entity_type === 'case',
          entity_type: rule.entity_type,
          entity_id: entityRecord['id'] as string,
          escalation_level: nextLevel,
        },
        actions: this.getEscalationActions(entityRecord, rule.entity_type),
        deep_link: this.getEntityDeepLink(entityRecord, rule.entity_type),
      };

      const notificationId = await NotificationRouter.createNotification(notification);

      if (notificationId) {
        // Log escalation
        await safeFrom(supabase, 'escalation_history').insert({
          notification_id: notificationId,
          rule_id: rule.id,
          from_user_id: (entityRecord['assigned_to'] || entityRecord['employee_id']) as string,
          to_user_id: targetUserId,
          escalation_level: nextLevel,
          reason: `Auto-escalated: ${rule.name}`,
        });
      }
    }
  }

  /**
   * Find users to escalate to based on role
   */
  private static async findEscalationTargets(
    entity: Record<string, unknown>,
    step: EscalationStep
  ): Promise<string[]> {
    // If specific user ID provided
    if (step.user_id) {
      return [step.user_id];
    }

    // Find users by role from profiles table
    type ValidRole = 'hr' | 'manager' | 'employee' | 'super_admin';
    const { data: roleData, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', step.role as ValidRole);

    if (error) {
      console.error('Error finding escalation targets:', error);
      return [];
    }

    // If entity has manager and step is 'manager', use that
    const assignedToProfile = entity['assigned_to_profile'] as Record<string, unknown> | undefined;
    if (step.role === 'manager' && assignedToProfile?.['manager_id']) {
      return [assignedToProfile['manager_id'] as string];
    }

    const employee = entity['employee'] as Record<string, unknown> | undefined;
    if (step.role === 'manager' && employee?.['manager_id']) {
      return [employee['manager_id'] as string];
    }

    // Otherwise return all users with the role
    return (roleData || []).map((u) => u.id);
  }

  /**
   * Get entity title for notification
   */
  private static getEntityTitle(entity: Record<string, unknown>, entityType: string): string {
    switch (entityType) {
      case 'task':
        return (entity['task_title'] as string) || 'Taak';
      case 'approval':
        return 'Goedkeuringsverzoek';
      case 'case': {
        const employee = entity['employee'] as Record<string, unknown> | undefined;
        return `Verzuimzaak ${employee?.['voornaam']} ${employee?.['achternaam']}`;
      }
      case 'employee':
        return `Contract ${entity['voornaam']} ${entity['achternaam']}`;
      default:
        return 'Item';
    }
  }

  /**
   * Get escalation message
   */
  private static getEscalationMessage(
    entity: Record<string, unknown>,
    rule: NotificationRule,
    level: number
  ): string {
    const escalationLevel = level === 0 ? 'Eerste' : level === 1 ? 'Tweede' : 'Derde';

    return `${escalationLevel} escalatie: ${rule.description || rule.name}. Actie vereist.`;
  }

  /**
   * Get actions for escalation notification
   */
  private static getEscalationActions(entity: Record<string, unknown>, entityType: string): NotificationAction[] {
    switch (entityType) {
      case 'task':
        return [
          { label: 'Bekijken', type: 'view', style: 'primary' },
          { label: 'Toewijzen', type: 'custom', style: 'default' },
        ];
      case 'approval':
        return [
          { label: 'Goedkeuren', type: 'approve', style: 'primary' },
          { label: 'Afwijzen', type: 'deny', style: 'destructive' },
        ];
      case 'case':
        return [
          { label: 'Open zaak', type: 'view', style: 'primary' },
        ];
      case 'employee':
        return [
          { label: 'Contract verlengen', type: 'custom', style: 'primary' },
          { label: 'Bekijken', type: 'view', style: 'default' },
        ];
      default:
        return [{ label: 'Bekijken', type: 'view', style: 'default' }];
    }
  }

  /**
   * Get deep link for entity
   */
  private static getEntityDeepLink(entity: Record<string, unknown>, entityType: string): string {
    switch (entityType) {
      case 'task':
        return `/tasks/${entity['id']}`;
      case 'approval':
        return `/hr/verlof`;
      case 'case':
        return `/case/${entity['id']}`;
      case 'employee':
        return `/hr/medewerkers/${entity['id']}`;
      default:
        return '/';
    }
  }

  /**
   * Create escalation rule
   */
  static async createRule(rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const { data, error } = await safeFrom(supabase, 'notification_rules')
      .insert(rule as never)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating rule:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Update escalation rule
   */
  static async updateRule(
    ruleId: string,
    updates: Partial<NotificationRule>
  ): Promise<boolean> {
    const { error } = await safeFrom(supabase, 'notification_rules')
      .update(updates as never)
      .eq('id', ruleId);

    if (error) {
      console.error('Error updating rule:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete escalation rule
   */
  static async deleteRule(ruleId: string): Promise<boolean> {
    const { error } = await safeFrom(supabase, 'notification_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Error deleting rule:', error);
      return false;
    }

    return true;
  }
}
