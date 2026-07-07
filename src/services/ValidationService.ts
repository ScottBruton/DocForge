import type { Document, Block } from '@/schema';
import type { Style } from '@/schema';
import type { Asset } from '@/schema';
import { collectAllIds } from '@/lib/documentFactory';
import { getTemplateById } from '@/templates';
import type { ValidationIssue } from '@/registry/types';
import { getBlockDefinition, isRegisteredBlockType } from '@/registry/BlockRegistry';

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export class ValidationService {
  static validate(
    document: Document,
    styles: Style[],
    assets: Asset[],
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const styleIds = new Set(styles.map((s) => s.id));
    const assetIds = new Set(assets.map((a) => a.id));
    const allIds = collectAllIds(document);
    const idCounts = new Map<string, number>();
    for (const id of allIds) {
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of idCounts) {
      if (count > 1) {
        issues.push({ path: id, message: `Duplicate ID: ${id}`, severity: 'error' });
      }
    }

    for (const section of document.sections) {
      if (section.blocks.length === 0) {
        issues.push({
          path: `sections.${section.id}`,
          message: `Section "${section.title}" is empty`,
          severity: 'warning',
        });
      }
      for (const block of section.blocks) {
        issues.push(...ValidationService.validateBlock(block, styleIds, assetIds));
      }
    }

    if (document.metadata.templateId) {
      const template = getTemplateById(document.metadata.templateId);
      if (template?.requiredSections) {
        for (const required of template.requiredSections) {
          const found = document.sections.some(
            (s) => s.title.toLowerCase() === required.toLowerCase(),
          );
          if (!found) {
            issues.push({
              path: 'sections',
              message: `Missing required section: ${required}`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return {
      issues,
      errorCount: issues.filter((i) => i.severity === 'error').length,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
    };
  }

  static validateBlock(
    block: Block,
    styleIds: Set<string>,
    assetIds: Set<string>,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!isRegisteredBlockType(block.type)) {
      issues.push({ path: block.id, message: `Unknown block type: ${block.type}`, severity: 'error' });
      return issues;
    }
    if (!styleIds.has(block.styleId)) {
      issues.push({ path: `${block.id}.styleId`, message: 'Invalid style reference', severity: 'error' });
    }
    if (block.type === 'figure' && block.content.assetId && !assetIds.has(block.content.assetId)) {
      issues.push({ path: `${block.id}.assetId`, message: 'Broken asset reference', severity: 'error' });
    }
    issues.push(...getBlockDefinition(block.type).validate(block));
    return issues;
  }

  static validateAIOutput(document: Document, styles: Style[], assets: Asset[]): ValidationResult {
    return ValidationService.validate(document, styles, assets);
  }
}
