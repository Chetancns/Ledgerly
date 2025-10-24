import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { uploadReceiptImage } from "../services/ai";

export default function UploadReceipt() {
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const handleSelectFile = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    setShowPickerModal(false);
  };

  const handleConfirmUpload = async () => {
    if (!previewImage) return;
    const blob  = await fetch(previewImage).then((r) => r.blob());
    const file = new File([blob], "receipt.jpg", { type: blob.type });
    const uploadPromise = uploadReceiptImage(file);

    toast.promise(uploadPromise, {
      loading:
        "Uploading your receipt... please wait, our free-tier backend may take a few seconds to wake up.",
      success:
        "✅ Transaction saved! AI may make mistakes — please review it in the Transactions page.",
      error: "❌ Upload failed. Please try again.",
    });

    try {
      await uploadPromise;
      setPreviewImage(null);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  return (
    <>
      {/* 📷 Upload Button */}
      <button
        onClick={() => {
          setShowPickerModal(true);
          if (!isMobileDevice) toast("📁 Only file upload available on desktop.");
        }}
        className="bg-green-400 text-indigo-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-green-300 transition"
      >
        📷
      </button>

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) =>
          e.target.files?.[0] && handleSelectFile(e.target.files[0])
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          e.target.files?.[0] && handleSelectFile(e.target.files[0])
        }
      />

      {/* Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-80 text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-white">
                Select Receipt Source
            </h2>
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
            <button
                onClick={() => setShowPickerModal(false)}
                className="mt-4 text-red-500  text-sm hover:text-red-700">
                Cancel
            </button>
            </div>
        </div>
        )}


      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-indigo-900/90 backdrop-blur-xl rounded-3xl p-6 w-96 text-center shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-white">🧾 Preview Your Receipt</h2>
            <img
                src={previewImage}
                alt="Receipt preview"
                className="rounded-lg mb-4 max-h-60 mx-auto"
            />
            <div className="flex gap-3 justify-center">
                <button
                onClick={() => {
                    setPreviewImage(null);
                    setShowPickerModal(true); // reopen modal for retake
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                🔁 Retake
                </button>
                <button
                onClick={handleConfirmUpload}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition"
                >
                ✅ Confirm
                </button>
                <button
                onClick={() => {
                    setPreviewImage(null);
                    setShowPickerModal(false);
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400 transition"
                >
                ❌ Cancel
                </button>
            </div>
            </div>
        </div>
        )}


    </>
  );
}
