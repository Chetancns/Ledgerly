import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { uploadAudioFile } from "../services/ai";

export default function UploadAudio() {
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const recordRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploading, setUploading] = useState(false);
  const handleSelectFile = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewAudio(url);
    setShowPickerModal(false);
  };

  const handleConfirmUpload = async () => {
    if (!previewAudio) return;
    setUploading(true);
    const file = await fetch(previewAudio).then((r) => r.blob());
    const uploadPromise = uploadAudioFile(file);

    toast.promise(uploadPromise, {
      loading: "Uploading your audio... please wait.",
      success:
        "🎙️ Transaction saved! AI may make mistakes — please review it in the Transactions page.",
      error: "❌ Upload failed. Please try again.",
    });

    try {
      await uploadPromise;
      setPreviewAudio(null);
    } catch (err) {
      console.error("Audio upload failed:", err);
    } finally {
      setUploading(false);
    }
  };
  const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setPreviewAudio(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
    setShowPickerModal(false);
    } catch (err) {
        console.error("Audio recording failed:", err);
        toast.error("🎙️ Microphone access denied or unavailable.");
    }
    };

    const stopRecording = () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        setRecording(false);
    }
    };


  return (
    <>
      {/* 🎤 Upload Button */}
      <button
        onClick={() => setShowPickerModal(true)}
        className="bg-purple-400 text-indigo-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-purple-300 transition"
      >
        🎤
      </button>

      {/* Hidden Inputs */}
      <input
        ref={recordRef}
        type="file"
        accept="audio/*"
        capture="user"
        className="hidden"
        onChange={(e) =>
          e.target.files?.[0] && handleSelectFile(e.target.files[0])
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) =>
          e.target.files?.[0] && handleSelectFile(e.target.files[0])
        }
      />

      {/* Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-80 text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-white">
              Select Audio Source
            </h2>
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
            <button
              onClick={() => setShowPickerModal(false)}
              className="mt-4 text-red-500 text-sm hover:text-red-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {recording && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-80 text-center shadow-xl">
                <p className="text-white font-semibold mb-4">🎙️ Recording in progress...</p>
                <button
                    onClick={stopRecording}
                    className="w-full py-2 bg-red-400 text-white rounded-xl hover:bg-red-300 transition"
                >
                    ⏹️ Stop Recording
                </button>
                </div>
            </div>
            )}

      {/* Preview Modal */}
      {previewAudio && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-96 text-center shadow-xl">
      <h2 className="text-lg font-semibold mb-4 text-white">🎧 Preview Your Recording</h2>
      <div className="flex flex-col items-center gap-3">
        <audio controls src={previewAudio} className="w-full rounded-lg" />
        <div className="flex gap-3">
          <button
            onClick={() => {
              setPreviewAudio(null);
              setShowPickerModal(true);
              setRecording(false);
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            🔁 Re-record
          </button>
          <button
            onClick={handleConfirmUpload}
            className={`px-4 py-2 rounded-lg transition ${
              uploading ? "bg-green-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-400"
            }`}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "✅ Confirm"}
          </button>
          <button
            onClick={() => {
              setPreviewAudio(null);
              setShowPickerModal(false);
              setRecording(false);
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400 transition"
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    </>
  );
}
