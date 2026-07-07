import type { Document } from '@/schema';
import type { StylesFile } from '@/schema';
import { createEmptyDocument, createSection } from '@/lib/documentFactory';
import { createDefaultStyles } from '@/lib/defaultStyles';

export interface Template {
  id: string;
  name: string;
  description: string;
  sectionTitles: string[];
  allowedBlockTypes: string[];
  requiredSections?: string[];
  createDocument: () => Document;
  styles?: StylesFile;
}

function makeTemplate(
  id: string,
  name: string,
  description: string,
  sectionTitles: string[],
  requiredSections?: string[],
): Template {
  return {
    id,
    name,
    description,
    sectionTitles,
    allowedBlockTypes: [
      'heading', 'paragraph', 'figure', 'table', 'bulletList', 'numberedList',
      'checklist', 'quote', 'equation', 'code', 'horizontalRule', 'pageBreak',
    ],
    requiredSections,
    createDocument: () => {
      const doc = createEmptyDocument(id);
      doc.metadata.title = name;
      doc.sections = sectionTitles.map((title, i) => createSection(title, i));
      return doc;
    },
    styles: createDefaultStyles(),
  };
}

export const TEMPLATES: Template[] = [
  makeTemplate('blank', 'Blank Document', 'Empty document with one section', ['Content']),
  makeTemplate('technical-report', 'Technical Report', 'Technical documentation', [
    'Abstract', 'Introduction', 'Methodology', 'Results', 'Discussion', 'Conclusion', 'References',
  ], ['Introduction', 'Conclusion']),
  makeTemplate('general-report', 'General Report', 'General purpose report', [
    'Executive Summary', 'Background', 'Findings', 'Recommendations', 'Appendix',
  ]),
  makeTemplate('procedure', 'Procedure', 'Step-by-step procedure', [
    'Purpose', 'Scope', 'Procedure', 'Safety', 'References',
  ], ['Procedure']),
  makeTemplate('specification', 'Specification', 'Technical specification', [
    'Overview', 'Requirements', 'Design', 'Interfaces', 'Testing', 'Appendix',
  ]),
  makeTemplate('meeting-notes', 'Meeting Notes', 'Meeting minutes', [
    'Attendees', 'Agenda', 'Discussion', 'Action Items', 'Next Steps',
  ]),
  makeTemplate('proposal', 'Proposal', 'Project proposal', [
    'Summary', 'Problem Statement', 'Proposed Solution', 'Timeline', 'Budget', 'Conclusion',
  ]),
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
