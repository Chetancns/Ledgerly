import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  FaSignOutAlt,
  FaPlus,
  FaCamera,
  FaEdit,
} from "react-icons/fa";
import { DevWarningBanner } from "./DevWarningBanner";
import { uploadReceiptImage, uploadAudioFile } from "../services/ai";
import toast from "react-hot-toast";
import TransactionForm from "./TransactionForm";
import UploadReceipt from "./UploadReceipt";
import UploadAudio from "./UploadAudio";
export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string }>({});
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);  
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState(false);
  const navItems = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/transactions", label: "Transactions", icon: "↔️" },
    { href: "/accounts", label: "Accounts", icon: "💳" },
    { href: "/categories", label: "Categories", icon: "📂" },
    { href: "/budgets", label: "Budget", icon: "💰" },
    { href: "/debts", label: "Debts", icon: "⚖️" },
    { href: "/help", label: "Help", icon: "❓" },
  ];

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleImageUpload = (file: File) => {
  setSelectedImageFile(file); // ✅ keep the file reference
  const reader = new FileReader();
  reader.onload = () => setPreviewImage(reader.result as string);
  reader.readAsDataURL(file);
};


  const confirmImageUpload = async () => {
  if (!selectedImageFile) {
    toast.error("Please select an image before confirming.");
    return;
  }

  const uploadPromise = uploadReceiptImage(selectedImageFile);

  toast.promise(uploadPromise, {
    loading: "Receipt received! Summoning the AI for analysis… (Free-tier backend stretching its legs—this may take a moment.).... ⏳",
    success: "✅ Transaction saved! AI isn’t flawless — take a moment to verify it in your Transactions.",
    error: "❌ Upload or parsing failed. Please try again.",
  });

  try {
    setUploading(true);
    const response = await uploadPromise;

    console.log("✅ AI response:", response.data);

    // If your backend saves the transaction automatically,
    // you can navigate or refresh the Transactions page:
    // router.push("/transactions");

  } catch (err) {
    console.error("❌ Image upload or AI processing failed:", err);
  } finally {
    setUploading(false);
    setShowModal(false);
    setPreviewImage(null);
    setSelectedImageFile(null);
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
  } catch (err) {
    console.error("Audio recording failed:", err);
    alert("Could not start recording. Please allow microphone access.");
  }
};

const stopRecording = () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    setRecording(false);
  }
};
  const confirmAudioUpload = async () => {
  if (!previewAudio) {
    alert("Please record audio before confirming.");
    return;
  }

  try {
    setUploading(true);

    // Convert the preview URL back into a Blob
    const responseBlob = await fetch(previewAudio).then((res) => res.blob());
    const uploadPromise = uploadAudioFile(responseBlob);

    toast.promise(uploadPromise, {
      loading: "Listening in… AI is gearing up to analyze your voice note. Free-tier backend stretching its legs—hang tight!... 🎤",
      success:
        "✅ Transaction saved! AI isn’t flawless — take a moment to verify it in your Transactions.",
      error: "❌ Audio upload or parsing failed. Please try again.",
    });

    const response = await uploadPromise;
    console.log("🎧 Audio upload response:", response.data);

    // Optionally navigate or refresh after success
    // router.push("/transactions");

  } catch (err) {
    console.error("❌ Audio upload failed:", err);
  } finally {
    setUploading(false);
    setShowModal(false);
    setPreviewAudio(null);
  }
};

  return (
    <>
      <Head>
        <title>💰 Ledgerly - Budget with Style</title>
      </Head>

      {/* Main wrapper - covers full mobile viewport */}
      <div className="app-fullheight bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white overflow-x-hidden">

        {/* Desktop Navbar */}
        <nav
          className="sticky top-0 z-50 hidden md:flex items-center px-6 py-3 backdrop-blur-md"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}
        >
          <span className="text-lg md:text-2xl font-extrabold tracking-wide text-white drop-shadow-md mr-6">
            💰 Ledgerly
          </span>

          <div className="flex gap-4 flex-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition ${
                    isActive
                      ? "bg-white/20 text-yellow-300"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="font-semibold text-sm md:text-base text-white/90">
              {user.name || "Guest"}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-sm md:text-base font-semibold shadow-md transition"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </nav>

        {/* Mobile Top Header */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden bg-black/40 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
          <span className="text-lg font-extrabold">💰 Ledgerly</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{user.name || "Guest"}</span>
            <button
              onClick={logout}
              className="bg-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {/* Dev Warning Banner */}
          <DevWarningBanner />
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-2 py-2 bg-black/40 backdrop-blur-md border-t border-white/20 md:hidden bottom-nav">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition ${
                  isActive ? "text-yellow-300" : "text-white/80 hover:text-white"
                }`}
              >
                <div className="text-lg">{item.icon}</div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Floating Expandable FAB */}
      {/* 🚀 Expandable Floating Action Button */}
{/* 🚀 Expandable Floating Action Button */}
<div className="fixed bottom-6 right-5 flex flex-col items-center gap-3 z-50">
  {expanded && (
    <div className="flex flex-col items-center gap-3 mb-2 transition-all duration-300">
      {/* 📸 Upload Receipt */}
      <UploadReceipt />

      {/* 🎤 Record Audio */}
      <UploadAudio />

      {/* ✏️ Manual Entry */}
      <button
        onClick={() => setShowForm(true)}
        className="bg-white/90 text-indigo-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-yellow-200 transition"
        title="Add Manually"
      >
        <FaEdit className="text-lg" />
      </button>
    </div>
  )}

  {/* ➕ Main Expand Button */}
  <button
    onClick={() => setExpanded((prev) => !prev)}
    className="bg-yellow-400 text-indigo-900 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl hover:bg-yellow-300 transition"
  >
    <FaPlus
      className={`text-2xl transform transition-transform ${
        expanded ? "rotate-45" : ""
      }`}
    />
  </button>
</div>

      

        {/* ===== Modal: Add Transaction Options ===== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div
              className="bg-indigo-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md relative shadow-xl border border-white/20 flex flex-col gap-6"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  handleImageUpload(file);
                } else {
                  alert("Please drop a valid image file.");
                }
              }}
            >
              <button
                onClick={() => {
                  setShowModal(false);
                  setPreviewImage(null);
                  setPreviewAudio(null);
                }}
                className="absolute top-3 right-3 text-white hover:text-yellow-300 text-xl"
              >
                ✖
              </button>

              <h2 className="text-xl font-bold text-center mb-2">
                Add Transaction
              </h2>

              {previewImage && (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-h-48 rounded-lg shadow-md border border-white/20"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="bg-gray-500 px-4 py-2 rounded-lg"
                    >
                      Retake
                    </button>
                    <button
                      onClick={confirmImageUpload}
                      className="bg-green-500 px-4 py-2 rounded-lg"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {previewAudio && (
                <div className="flex flex-col items-center gap-3">
                  <audio controls src={previewAudio} className="w-full" />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPreviewAudio(null)}
                      className="bg-gray-500 px-4 py-2 rounded-lg"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={confirmAudioUpload}
                      className="bg-green-500 px-4 py-2 rounded-lg"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {!previewImage && !previewAudio && (
                <>
                  <div
                    className="border-2 border-dashed border-white/30 rounded-xl p-6 text-center hover:border-yellow-400 transition cursor-pointer"
                    onClick={() =>
                      document.getElementById("imageInput")?.click()
                    }
                  >
                    <p className="text-white/70 text-sm mb-1">
                      Drag & drop a receipt image here or click to upload
                    </p>
                    <FaCamera className="mx-auto text-3xl text-yellow-300" />
                  </div>

                  <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleImageUpload(e.target.files[0])
                    }
                  />

                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`${
                      recording
                        ? "bg-red-500 animate-pulse"
                        : "bg-blue-500 hover:bg-blue-400"
                    } text-white px-4 py-3 rounded-lg font-semibold w-full`}
                  >
                    {recording ? "⏹ Stop Recording" : "🎤 Record Audio"}
                  </button>

                  <button
                    onClick={() => {
                      setShowModal(false);
                      setShowForm(true);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 px-4 py-3 rounded-lg font-semibold w-full flex items-center justify-center gap-2"
                  >
                    <FaEdit /> Add Manually
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {/* ✅ Transaction Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-indigo-900/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-2xl relative shadow-xl border border-white/20">
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-3 right-3 text-white hover:text-yellow-300 text-xl"
              >
                ✖
              </button>
              <TransactionForm
                onCreated={() => {
                  setShowForm(false);
                  router.push("/transactions");
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
