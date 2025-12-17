import { useMemo } from "react";
import { useSmartCharacter } from "./useSmartCharacter";

// Tribe IDs
export const TRIBE_IDS = {
  WOLF: 98000362,
  AWAR: 98000374,
} as const;

export type TribeAccess = "full" | "visitor" | "denied";

export type UseTribeVerificationResult = {
  tribeId: number | null;
  tribeName: string | null;
  accessLevel: TribeAccess;
  isWolfMember: boolean;
  isAwarMember: boolean;
  hasAccess: boolean;
  isLoading: boolean;
  error: string | null;
};

/**
 * Hook to verify user's tribe membership and determine access level
 *
 * Access levels:
 * - "full": WOLF tribe members (ID: 98000319)
 * - "visitor": AWAR tribe members (ID: 98000328)
 * - "denied": All other users (no tribe or different tribe)
 */
export function useTribeVerification(address?: string | null): UseTribeVerificationResult {
  const { character, isLoading, error } = useSmartCharacter(address);

  const tribeId = useMemo(() => {
    if (!character) return null;

    // Try various possible locations for tribe ID in the character data
    const candidates: any[] = [
      (character as any)?.tribeId,
      (character as any)?.tribe?.id,
      (character as any)?.metadata?.tribeId,
      (character as any)?.metadata?.tribe?.id,
      (character as any)?.character?.tribeId,
      (character as any)?.character?.tribe?.id,
    ];

    for (const candidate of candidates) {
      if (candidate != null) {
        const id = Number(candidate);
        if (Number.isFinite(id)) return id;
      }
    }

    return null;
  }, [character]);

  const tribeName = useMemo(() => {
    if (!character) return null;

    // Try to find tribe name in character data
    const candidates: any[] = [
      (character as any)?.tribeName,
      (character as any)?.tribe?.name,
      (character as any)?.metadata?.tribeName,
      (character as any)?.metadata?.tribe?.name,
      (character as any)?.character?.tribeName,
      (character as any)?.character?.tribe?.name,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === "string") {
        return candidate;
      }
    }

    // Fallback to tribe ID-based names
    if (tribeId === TRIBE_IDS.WOLF) return "WOLF";
    if (tribeId === TRIBE_IDS.AWAR) return "AWAR";

    return null;
  }, [character, tribeId]);

  const isWolfMember = useMemo(() => tribeId === TRIBE_IDS.WOLF, [tribeId]);
  const isAwarMember = useMemo(() => tribeId === TRIBE_IDS.AWAR, [tribeId]);

  const accessLevel: TribeAccess = useMemo(() => {
    if (isWolfMember) return "full";
    if (isAwarMember) return "visitor";
    return "denied";
  }, [isWolfMember, isAwarMember]);

  const hasAccess = useMemo(() => accessLevel !== "denied", [accessLevel]);

  return {
    tribeId,
    tribeName,
    accessLevel,
    isWolfMember,
    isAwarMember,
    hasAccess,
    isLoading,
    error,
  };
}
