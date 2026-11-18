import { ExecutionTier, ObligationZeroState } from '../types';

export interface ExecutionTierMeta {
  tier: ExecutionTier;
  label: string;
  shortLabel: string;
  colorHex: string;
  dotClass: string;
  badgeClass: string;
  barClass: string;
  cardBorderClass: string;
}

export interface EvaluateTierOptions {
  isSunday?: boolean;
  isFrozen?: boolean;
  isPreLaunch?: boolean;
  isEmpty?: boolean;
  streakThreshold?: number;
  streakMinPercent?: number;
}

/**
 * Evaluates execution tier strictly according to centralized palette & rules:
 * - Rest / Frozen -> 'protected' (#6B7280, 100%)
 * - Pre-Launch -> 'pre_launch' (null %)
 * - Empty -> 'empty' (null %, amber "Pipeline Empty — Refill Required")
 * - >= 90 -> 'elite' (#10B981)
 * - 50–89 (or >= streakMinPercent) -> 'partial' (#F59E0B)
 * - < 50 -> 'critical' (#EF4444)
 */
export function evaluateExecutionTier(
  percentage: number | null,
  options?: EvaluateTierOptions
): ExecutionTier {
  if (options?.isFrozen || options?.isSunday) return 'protected';
  if (options?.isPreLaunch) return 'pre_launch';
  if (options?.isEmpty || percentage === null) return 'empty';

  const minPct = Math.min(
    90,
    Math.max(1, Math.round(options?.streakMinPercent ?? options?.streakThreshold ?? 50))
  );

  if (percentage >= 90) return 'elite';
  if (percentage >= minPct) return 'partial';
  return 'critical';
}

/**
 * Single source of truth for execution tier colors, labels, and styles.
 */
export function getExecutionTierMeta(
  percentage: number | null,
  options?: EvaluateTierOptions
): ExecutionTierMeta {
  const tier = evaluateExecutionTier(percentage, options);

  if (options?.isFrozen) {
    return {
      tier: 'protected',
      label: '100% Protected (Frozen)',
      shortLabel: 'Protected 100%',
      colorHex: '#6B7280',
      dotClass: 'bg-[#6B7280]',
      badgeClass: 'bg-[#6B7280]/20 text-slate-200 border-[#6B7280]/50',
      barClass: 'bg-[#6B7280]',
      cardBorderClass: 'border-[#6B7280]/40 bg-slate-800/40 hover:border-[#6B7280]/70',
    };
  }

  if (options?.isSunday || tier === 'protected') {
    return {
      tier: 'protected',
      label: '100% Protected (Rest Day)',
      shortLabel: 'Protected 100%',
      colorHex: '#6B7280',
      dotClass: 'bg-[#6B7280]',
      badgeClass: 'bg-[#6B7280]/20 text-slate-200 border-[#6B7280]/50',
      barClass: 'bg-[#6B7280]',
      cardBorderClass: 'border-[#6B7280]/40 bg-slate-800/40 hover:border-[#6B7280]/70',
    };
  }

  if (tier === 'pre_launch') {
    return {
      tier: 'pre_launch',
      label: 'Pre-Launch',
      shortLabel: 'Pre-Launch',
      colorHex: '#475569',
      dotClass: 'bg-slate-600',
      badgeClass: 'bg-slate-900/60 text-slate-400 border-white/10',
      barClass: 'bg-slate-600',
      cardBorderClass: 'border-white/5 bg-slate-900/30 hover:border-white/10 opacity-70 hover:opacity-100',
    };
  }

  if (tier === 'empty') {
    return {
      tier: 'empty',
      label: 'Pipeline Empty — Refill Required',
      shortLabel: 'Pipeline Empty',
      colorHex: '#F59E0B',
      dotClass: 'bg-[#F59E0B]',
      badgeClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35',
      barClass: 'bg-[#F59E0B]',
      cardBorderClass: 'border-[#F59E0B]/35 bg-[#F59E0B]/10 hover:border-[#F59E0B]/60',
    };
  }

  if (tier === 'elite') {
    return {
      tier: 'elite',
      label: 'Elite Execution',
      shortLabel: 'Elite',
      colorHex: '#10B981',
      dotClass: 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.55)]',
      badgeClass: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/35',
      barClass: 'bg-[#10B981]',
      cardBorderClass: 'border-[#10B981]/35 bg-[#10B981]/10 hover:border-[#10B981]/60',
    };
  }

  if (tier === 'partial') {
    return {
      tier: 'partial',
      label: 'Partial Execution',
      shortLabel: 'Partial',
      colorHex: '#F59E0B',
      dotClass: 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.45)]',
      badgeClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35',
      barClass: 'bg-[#F59E0B]',
      cardBorderClass: 'border-[#F59E0B]/35 bg-[#F59E0B]/10 hover:border-[#F59E0B]/60',
    };
  }

  return {
    tier: 'critical',
    label: 'Critical Miss',
    shortLabel: 'Critical',
    colorHex: '#EF4444',
    dotClass: 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.45)]',
    badgeClass: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/35',
    barClass: 'bg-[#EF4444]',
    cardBorderClass: 'border-[#EF4444]/35 bg-[#EF4444]/10 hover:border-[#EF4444]/60',
  };
}

/**
 * Computes capped primary grade percentage (never > 100%, returns null on pre_launch / empty).
 */
export function getGradeablePercentage(
  actual: number,
  capacityTarget: number,
  zeroState: ObligationZeroState
): number | null {
  if (zeroState === 'rest' || zeroState === 'frozen') return 100;
  if (zeroState === 'pre_launch' || zeroState === 'empty') return null;
  if (capacityTarget <= 0) return null;
  return Math.min(100, Math.round((Math.max(0, actual) / capacityTarget) * 100));
}

export function getSupplyGapBadgeMeta(supplyGap: boolean) {
  if (!supplyGap) return null;
  return {
    label: 'Supply Gap',
    tooltip: 'Scheduled supply fell short of daily workspace quota',
    badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
  };
}

export function getRemovedMidDayBadgeMeta(removedMidDay: number) {
  if (!removedMidDay || removedMidDay <= 0) return null;
  return {
    label: `${removedMidDay} Removed Mid-Day`,
    tooltip: 'Leads archived or cancelled after day obligation locked (quota preserved)',
    badgeClass: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  };
}
