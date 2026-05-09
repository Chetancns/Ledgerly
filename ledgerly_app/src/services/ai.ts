import api from './api';
import { AIDraftTransaction, AIParseResponse, AISaveResponse, AIChatResponse } from '@/models/AI';

export const parseTransaction = (input: string, preview = false) =>
  api.post<AIParseResponse>('/ai/parse-transaction', { text: input }, { params: { preview: String(preview) } });

export const uploadReceiptImage = (image: File, preview = false) => {
  const formData = new FormData();
  formData.append('file', image);
  return api.post<AIParseResponse>('/ai/image', formData, {
    params: { preview: String(preview) },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadAudioFile = (audio: Blob, preview = false) => {
  const formData = new FormData();
  formData.append('file', audio, 'recording.webm');
  return api.post<AIParseResponse>('/ai/audio', formData, {
    params: { preview: String(preview) },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const saveParsedTransactions = (transactions: AIDraftTransaction[]) =>
  api.post<AISaveResponse>('/ai/save-transactions', { transactions });

export const askAiChat = (question: string) => api.post<AIChatResponse>('/ai/chat', { question });
