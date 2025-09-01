export interface LoginResponse {
  user: import("./User").User;
  accessToken: string;
}