import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { uploadAudioFile, saveParsedTransactions } from '../services/ai';
import { AIDraftTransaction } from '@/models/AI';
import { getUserAccount } from '@/services/accounts';
import { getUserCategory } from '@/services/category';

interface SimpleAccount {
  id: string;
  name?: string;
}

interface SimpleCategory {
  id: string;
  name?: string;
}

export default function UploadAudio() {
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<AIDraftTransaction[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [categories, setCategories] = useState<SimpleCategory[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [accRes, catRes] = await Promise.all([getUserAccount(), getUserCategory()]);
        setAccounts(accRes);
        setCategories(catRes);
      } catch {
        // ignore
      }
    };
    loadOptions();
  }, []);

  const resetAll = () => {
    setShowPickerModal(false);
    setPreviewAudio(null);
    setAudioBlob(null);
    setDrafts([]);
    setRecording(false);
  };

  const handleSelectFile = (file: File) => {
    if (!file) return;
    setPreviewAudio(URL.createObjectURL(file));
    setAudioBlob(file);
    setShowPickerModal(false);
    setDrafts([]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setPreviewAudio(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setShowPickerModal(false);
    } catch (err) {
      console.error('Audio recording failed:', err);
      toast.error('🎙️ Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleParseAudio = async () => {
    if (!audioBlob) return;
    setParsing(true);
    try {
      const parsePromise = uploadAudioFile(audioBlob, true);
      toast.promise(parsePromise, {
        loading: 'Parsing audio with AI…',
        success: 'Parsed. Please review before saving.',
        error: 'Failed to parse audio.',
      });
      const response = await parsePromise;
      const data = response.data;
      if (!data.success || !data.transactions?.length) {
        toast.error(data.message || 'Could not parse this audio confidently.');
        return;
      }
      setDrafts(data.transactions);
    } catch (err) {
      console.error('Audio parse failed:', err);
    } finally {
      setParsing(false);
    }
  };

  const updateDraft = (index: number, patch: Partial<AIDraftTransaction>) => {
    setDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSaveReviewed = async () => {
    setSaving(true);
    try {
      const savePromise = saveParsedTransactions(drafts);
      toast.promise(savePromise, {
        loading: 'Saving reviewed transactions…',
        success: 'Review complete and save request finished.',
        error: 'Failed to save reviewed transactions.',
      });
      const res = await savePromise;
      if (res.data.saved.length > 0) {
        toast.success(`Saved ${res.data.saved.length} transaction(s).`);
      }
      if (res.data.skipped.length > 0) {
        toast.error(`${res.data.skipped.length} transaction(s) still need review.`);
      }
      if (res.data.saved.length > 0 && res.data.skipped.length === 0) {
        resetAll();
      }
    } catch (err) {
      console.error('Save reviewed transactions failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPickerModal(true)}
        className="bg-purple-400 text-indigo-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-purple-300 transition"
      >
        🎤
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
      />

      {showPickerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-80 text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-white">Select Audio Source</h2>
            <div className="space-y-3">
              <button
                onClick={startRecording}
                className="w-full py-2 bg-yellow-400 text-indigo-900 rounded-xl hover:bg-yellow-300 transition"
              >
                🎙️ Record Audio
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition"
              >
                📁 Choose from Files
              </button>
            </div>
            <button onClick={() => setShowPickerModal(false)} className="mt-4 text-red-500 text-sm hover:text-red-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {recording && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-80 text-center shadow-xl">
            <p className="text-white font-semibold mb-4">🎙️ Recording in progress...</p>
            <button onClick={stopRecording} className="w-full py-2 bg-red-400 text-white rounded-xl hover:bg-red-300 transition">
              ⏹️ Stop Recording
            </button>
          </div>
        </div>
      )}

      {previewAudio && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-4xl text-center shadow-xl max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4 text-white">🎧 Review Parsed Audio Before Save</h2>

            {!drafts.length ? (
              <div className="flex flex-col items-center gap-3">
                <audio controls src={previewAudio} className="w-full rounded-lg" />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPreviewAudio(null);
                      setAudioBlob(null);
                      setShowPickerModal(true);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    🔁 Re-record
                  </button>
                  <button
                    onClick={handleParseAudio}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition"
                    disabled={parsing}
                  >
                    {parsing ? 'Parsing…' : 'Parse Audio'}
                  </button>
                  <button onClick={resetAll} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400 transition">
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {drafts.map((draft, idx) => (
                  <div key={idx} className="rounded-xl p-4 bg-white/10 border border-white/20">
                    <div className="flex justify-between mb-2 text-sm text-white/90">
                      <span>Transaction #{idx + 1}</span>
                      <span className={draft.needsReview ? 'text-yellow-300 font-semibold' : 'text-green-300'}>
                        Confidence {Math.round((draft.confidence || 0) * 100)}% {draft.needsReview ? '• Needs review' : ''}
                      </span>
                    </div>
                    {draft.reviewReason && <p className="text-xs text-yellow-100 mb-2">{draft.reviewReason}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={draft.accountId || ''}
                        onChange={(e) => updateDraft(idx, { accountId: e.target.value, needsReview: false })}
                        className="px-3 py-2 rounded-lg bg-white/90 text-gray-900"
                      >
                        <option value="">Select account</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name || 'Unnamed Account'}
                          </option>
                        ))}
                      </select>

                      <select
                        value={draft.categoryId || ''}
                        onChange={(e) => updateDraft(idx, { categoryId: e.target.value, needsReview: false })}
                        className="px-3 py-2 rounded-lg bg-white/90 text-gray-900"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name || 'Unnamed Category'}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        value={draft.transactionDate}
                        onChange={(e) => updateDraft(idx, { transactionDate: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-white/90 text-gray-900"
                      />

                      <input
                        type="number"
                        step="0.01"
                        value={draft.amount}
                        onChange={(e) => updateDraft(idx, { amount: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-white/90 text-gray-900"
                      />

                      <input
                        type="text"
                        value={draft.description || ''}
                        onChange={(e) => updateDraft(idx, { description: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-white/90 text-gray-900 md:col-span-2"
                        placeholder="Description"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setDrafts([]);
                      setShowPickerModal(true);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    🔁 Parse Another
                  </button>
                  <button
                    onClick={handleSaveReviewed}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : '✅ Confirm & Save'}
                  </button>
                  <button onClick={resetAll} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400 transition">
                    ❌ Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
