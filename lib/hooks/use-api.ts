'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useEntitySearch(query: string) {
  return useQuery({
    queryKey: ['entity-search', query],
    queryFn: () => api.searchEntities(query)
  });
}

export function useEntity(id: string) {
  return useQuery({ queryKey: ['entity', id], queryFn: () => api.getEntity(id), enabled: !!id });
}

export function useClaims(id: string) {
  return useQuery({ queryKey: ['claims', id], queryFn: () => api.getClaimsForEntity(id), enabled: !!id });
}

export function useEvidence(claimId: string) {
  return useQuery({ queryKey: ['evidence', claimId], queryFn: () => api.getEvidenceForClaim(claimId), enabled: !!claimId });
}

export function useEvidenceForClaims(claimIds: string[]) {
  return useQuery({
    queryKey: ['evidence-many', ...claimIds],
    queryFn: () => api.getEvidenceForClaims(claimIds),
    enabled: claimIds.length > 0
  });
}

export function useGraph(id: string) {
  return useQuery({ queryKey: ['graph', id], queryFn: () => api.getGraphForEntity(id), enabled: !!id });
}

export function useVoiceAnalyses(id: string) {
  return useQuery({ queryKey: ['voice', id], queryFn: () => api.getVoiceAnalysesForEntity(id), enabled: !!id });
}

export function useWatchlist() {
  return useQuery({ queryKey: ['watchlist'], queryFn: api.getWatchlistCompanies });
}

export function useOutbreakFeed() {
  return useQuery({ queryKey: ['outbreak-feed'], queryFn: api.getOutbreakFeed });
}

export function useReport(id: string) {
  return useQuery({ queryKey: ['report', id], queryFn: () => api.getReportBundle(id), enabled: !!id });
}

export function useSubmitVoiceAnalysis(entityId: string) {
  return useMutation({ mutationFn: (file: File) => api.submitVoiceAnalysis(entityId, file) });
}

export function useTriggerFreshScan() {
  return useMutation({
    mutationFn: (payload: {
      subjectEntityId: string;
      speakerEntityId?: string;
      transcriptText: string;
      sourceUrl?: string;
      sourceTitle?: string;
    }) => api.triggerFreshScan(payload)
  });
}
