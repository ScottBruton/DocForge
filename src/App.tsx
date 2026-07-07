import { AppShell } from '@/components/layout/AppShell';
import { DetachedPreviewShell } from '@/components/preview/DocumentPreviewPane';
import { useKeyboardShortcuts, useAutosave } from '@/hooks/useKeyboardShortcuts';
import { usePreviewSyncMain } from '@/hooks/usePreviewSync';
import { useEffect } from 'react';
import { ProjectService } from '@/services/ProjectService';
import { isPreviewRoute } from '@/services/preview/PreviewWindowService';

function App() {
  if (isPreviewRoute()) {
    return <DetachedPreviewShell />;
  }

  return <MainApp />;
}

function MainApp() {
  useKeyboardShortcuts();
  useAutosave();
  usePreviewSyncMain();

  useEffect(() => {
    (async () => {
      await ProjectService.loadRecent().catch(() => {});
      await ProjectService.restoreLastProject().catch(() => {});
    })();
  }, []);

  return <AppShell />;
}

export default App;
