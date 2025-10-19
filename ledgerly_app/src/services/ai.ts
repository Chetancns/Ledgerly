import api from "./api";
export const parseTransaction = (input: string) =>
  api.post("/ai/parse-transaction", { text:input });

export const uploadReceiptImage = (image: File) => {
  const formData = new FormData();
  formData.append("file", image); 
  return api.post("/ai/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export const uploadAudioFile = (audio: Blob) => {
  const formData = new FormData();
  formData.append("file", audio, "recording.webm");   
  return api.post("/ai/audio", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}