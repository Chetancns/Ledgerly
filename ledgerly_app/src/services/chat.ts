import { askAiChat } from './ai';

export const sendChatQuestion = async (question: string) => {
  const res = await askAiChat(question);
  return res.data;
};
