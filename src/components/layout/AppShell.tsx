import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MenuBar } from '@/components/layout/MenuBar';
import { Toolbar } from '@/components/layout/Toolbar';
import { StatusBar } from '@/components/layout/StatusBar';
import { DocumentTree } from '@/components/tree/DocumentTree';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { PropertiesInspector } from '@/components/inspector/PropertiesInspector';
import { AssetLibrary } from '@/components/assets/AssetLibrary';
import { DocumentPreviewPane } from '@/components/preview/DocumentPreviewPane';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { GenerationModal } from '@/components/ai/GenerationModal';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import { StyleManagerModal } from '@/components/settings/StyleManagerModal';
import { ProjectTemplateModal } from '@/components/settings/ProjectTemplateModal';
import { ContextMenu } from '@/components/ai/ContextMenu';
import { useUIStore } from '@/stores';

export function AppShell() {
  const previewOpen = useUIStore((s) => s.previewOpen);
  const previewDetached = useUIStore((s) => s.previewDetached);
  const showInlinePreview = previewOpen && !previewDetached;

  return (
    <div className="flex h-full flex-col">
      <MenuBar />
      <Toolbar />
      <div className="flex min-h-0 flex-1 flex-col">
        <PanelGroup direction="vertical" className="min-h-0 flex-1">
          <Panel defaultSize={75} minSize={40}>
            <PanelGroup direction="horizontal">
              <Panel defaultSize={18} minSize={12} maxSize={30}>
                <ErrorBoundary>
                  <div className="h-full border-r border-zinc-800 bg-zinc-950">
                    <DocumentTree />
                  </div>
                </ErrorBoundary>
              </Panel>
              <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />
              <Panel defaultSize={showInlinePreview ? 38 : 57} minSize={24}>
                <ErrorBoundary>
                  <div className="h-full bg-zinc-950">
                    <EditorCanvas />
                  </div>
                </ErrorBoundary>
              </Panel>
              {showInlinePreview && (
                <>
                  <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />
                  <Panel defaultSize={22} minSize={15} maxSize={45}>
                    <ErrorBoundary>
                      <div className="h-full border-l border-zinc-800 bg-zinc-950">
                        <DocumentPreviewPane />
                      </div>
                    </ErrorBoundary>
                  </Panel>
                </>
              )}
              <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />
              <Panel defaultSize={showInlinePreview ? 22 : 25} minSize={15} maxSize={35}>
                <ErrorBoundary>
                  <div className="h-full border-l border-zinc-800 bg-zinc-950">
                    <PropertiesInspector />
                  </div>
                </ErrorBoundary>
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />
          <Panel defaultSize={25} minSize={5} maxSize={40}>
            <ErrorBoundary>
              <AssetLibrary />
            </ErrorBoundary>
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
      <SettingsModal />
      <GenerationModal />
      <ValidationPanel />
      <StyleManagerModal />
      <ProjectTemplateModal />
      <ContextMenu />
    </div>
  );
}
