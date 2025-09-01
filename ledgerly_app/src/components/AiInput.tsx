import { useState } from "react";
import { parseTransaction } from "../services/ai";

export default function AiInput() {//{ onCreated }: { onCreated: () => void }
//   const [input, setInput] = useState("");
//   const [listening, setListening] = useState(false);
    
//   // Speech-to-text using Web Speech API
//   const handleMic = () => {
//     if (!("webkitSpeechRecognition" in window)) {
//       alert("Speech recognition not supported");
//       return;
//     }
//     const recognition = new window.webkitSpeechRecognition();
//     recognition.lang = "en-US";
//     recognition.onresult = async (event: SpeechRecognitionResult) => {
//       const transcript = event.results[0][0].transcript;
//       setInput(transcript);
//     };
//     recognition.start();
//     setListening(true);
//     recognition.onend = () => setListening(false);
//   };

//   const handleSubmit = async () => {
//     await parseTransaction(input);
//     setInput("");
//     onCreated();
//   };

  return (
    // <div className="space-y-2">
    //   <textarea value={input} onChange={(e) => setInput(e.target.value)} className="border p-2 w-full"/>
    //   <div className="flex gap-2">
    //     <button onClick={handleMic} className="bg-gray-500 text-white p-2 rounded">
    //       {listening ? "Listening..." : "🎤 Speak"}
    //     </button>
    //     <button onClick={handleSubmit} className="bg-green-500 text-white p-2 rounded">
    //       Submit AI Input
    //     </button>
    //   </div>
      // </div>
      <div>Called AI Module</div>
  );
}
