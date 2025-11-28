import api from "./api";

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateMe = async (payload: {
  name?: string;
  email?: string;
  currency?: string;
  password?: string;
  currentPassword?: string;
}) => {
  const res = await api.put('/users', payload);
  return res.data;
};
