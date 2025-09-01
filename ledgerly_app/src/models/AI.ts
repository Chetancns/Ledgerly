export interface AIParseRequest {
  input: string;
}

export interface AIParseResponse {
  transaction: import("./Transaction").Transaction;
}