import api from "./api";
export const parseTransaction = (input: string) =>
  api.post("/ai/parse", { input });