import { useState } from 'react';
import { useAIStore, useDocumentStore, useAssetStore } from '@/stores';
import { AIPipeline, type GenerationOptions } from '@/services/ai/AIPipeline';
import { ReferenceDocReader } from '@/services/ai/AIPipeline';
import { TEMPLATES } from '@/templates';
import { X } from 'lucide-react';

export function GenerationModal() {
  const isOpen = useAIStore((s) => s.isModalOpen);
  const setOpen = useAIStore((s) => s.setModalOpen);
  const isGenerating = useAIStore((s) => s.isGenerating);
  const currentStep = useAIStore((s) => s.currentStep);
  const progressLog = useAIStore((s) => s.progressLog);
  const lastError = useAIStore((s) => s.lastError);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const assets = useAssetStore((s) => s.assets);

  const [prompt, setPrompt] = useState('');
  const [templateId, setTemplateId] = useState('blank');
  const [documentType, setDocumentType] = useState('report');
  const [tone, setTone] = useState('professional');
  const [detailLevel, setDetailLevel] = useState('detailed');
  const [leaveBlanks, setLeaveBlanks] = useState(false);
  const [referenceTexts, setReferenceTexts] = useState<string[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const handleGenerate = async () => {
    const options: GenerationOptions = {
      prompt,
      referenceTexts,
      selectedAssetIds,
      templateId,
      documentType,
      tone,
      detailLevel,
      leaveBlanks,
    };
    const result = await AIPipeline.generate(options, assets);
    if (result) {
      dispatch({ type: 'APPLY_AI_PATCH', document: result });
      setOpen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const texts: string[] = [];
    for (const file of Array.from(files)) {
      texts.push(await ReferenceDocReader.readFile(file));
    }
    setReferenceTexts((prev) => [...prev, ...texts]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-violet-300">Generate with AI</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <textarea
            className="h-32 w-full resize-none rounded border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none"
            placeholder="Describe the document you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-zinc-400">
              Template
              <select className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Document type
              <input className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
            </label>
            <label className="text-xs text-zinc-400">
              Tone
              <select className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="technical">Technical</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Detail level
              <select className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={detailLevel} onChange={(e) => setDetailLevel(e.target.value)}>
                <option value="brief">Brief</option>
                <option value="moderate">Moderate</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={leaveBlanks} onChange={(e) => setLeaveBlanks(e.target.checked)} />
            Leave some sections blank
          </label>
          <label className="block text-xs text-zinc-400">
            Reference documents
            <input type="file" multiple accept=".docx,.pdf,.txt,.md,.csv,.xlsx" className="mt-1 text-xs" onChange={handleFileUpload} />
          </label>
          <label className="block text-xs text-zinc-400">
            Project assets
            <select
              multiple
              className="mt-1 h-20 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              value={selectedAssetIds}
              onChange={(e) => setSelectedAssetIds(Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              {assets.map((a) => <option key={a.id} value={a.id}>{a.filename}</option>)}
            </select>
          </label>
          {isGenerating && (
            <div className="rounded border border-zinc-800 bg-zinc-950 p-3">
              <div className="mb-2 text-xs text-violet-400">Progress</div>
              <div className="max-h-32 overflow-auto font-mono text-[10px] text-zinc-500">
                {progressLog.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
          )}
          {lastError && <p className="text-xs text-red-400">{lastError}</p>}
        </div>
        <div className="border-t border-zinc-800 p-4">
          <button
            type="button"
            disabled={isGenerating || !prompt.trim()}
            onClick={handleGenerate}
            className="w-full rounded bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {isGenerating ? `Generating (${currentStep})...` : 'Generate Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
