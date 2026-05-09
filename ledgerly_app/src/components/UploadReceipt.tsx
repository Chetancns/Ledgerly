import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { uploadReceiptImage, saveParsedTransactions } from '../services/ai';
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

export default function UploadReceipt() {
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<AIDraftTransaction[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [categories, setCategories] = useState<SimpleCategory[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [accRes, catRes] = await Promise.all([getUserAccount(), getUserCategory()]);
        setAccounts(accRes);
        setCategories(catRes);
      } catch {
        // ignore; user can still parse and review later
      }
    };
    loadOptions();
  }, []);

  const resetAll = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setDrafts([]);
    setShowPickerModal(false);
  };

  const handleSelectFile = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewImage(url);
    setDrafts([]);
    setShowPickerModal(false);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setParsing(true);
    try {
      const parsePromise = uploadReceiptImage(selectedFile, true);
      toast.promise(parsePromise, {
        loading: 'Parsing receipt with AI…',
        success: 'Parsed. Please review and confirm before saving.',
        error: 'Failed to parse receipt.',
      });
      const response = await parsePromise;
      const data = response.data;
      if (!data.success || !data.transactions?.length) {
        toast.error(data.message || 'Could not parse this receipt confidently.');
        return;
      }
      setDrafts(data.transactions);
    } catch (err) {
      console.error('Image parse failed:', err);
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
        onClick={() => {
          setShowPickerModal(true);
          if (!isMobileDevice) toast('📁 Only file upload available on desktop.');
        }}
        className="bg-green-400 text-indigo-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-green-300 transition"
      >
        📷
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
      />

      {showPickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-80 text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-white">Select Receipt Source</h2>
            <div className="space-y-3">
              {isMobileDevice && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-2 bg-yellow-400 text-indigo-900 rounded-xl hover:bg-yellow-300 transition"
                >
                  📸 Take a Photo
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-100 transition"
              >
                🖼️ Choose from Gallery
              </button>
            </div>
            <button onClick={() => setShowPickerModal(false)} className="mt-4 text-red-500 text-sm hover:text-red-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-4xl text-center shadow-xl max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4 text-white">🧾 Review Parsed Receipt Before Save</h2>

            {!drafts.length ? (
              <>
                <img src={previewImage} alt="Receipt preview" className="rounded-lg mb-4 max-h-60 mx-auto" />
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      setSelectedFile(null);
                      setShowPickerModal(true);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    🔁 Retake
                  </button>
                  <button
                    onClick={handleConfirmUpload}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition"
                    disabled={parsing}
                  >
                    {parsing ? 'Parsing…' : 'Parse Receipt'}
                  </button>
                  <button onClick={resetAll} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400 transition">
                    ❌ Cancel
                  </button>
                </div>
              </>
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
                    {draft.reviewReason && (
                      <p className="text-xs text-yellow-100 mb-2">{draft.reviewReason}</p>
                    )}
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
