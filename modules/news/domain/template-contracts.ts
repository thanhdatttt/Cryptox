export interface TemplateSelectors {
  container: string;
  title: string;
  summary: string;
  link: string;
  time: string;
  tags?: string;
}

export interface ExtractionTemplate {
  id: string;
  domain: string;
  version: string;
  selectors: TemplateSelectors;
  sampleHtmlSnippet?: string;
  confidence: number;
  defectRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateValidationStats {
  evaluatedCount: number;
  emptyFieldsPercent: number;
  formatErrorsPercent: number;
  totalDefectPercent: number;
  integrityPercent: number;
  isHighError: boolean;
  confidence: number;
}

export interface SelfHealingProposal {
  domain: string;
  currentVersion: string;
  proposedVersion: string;
  proposedSelectors: TemplateSelectors;
  expectedDefectPercent: number;
  reason: string;
}
