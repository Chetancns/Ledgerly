import api from "./api";

export async function getUserAccount() {
    const res = await api.get("/accounts/accountusers");
    console.log(res);
    return res.data;
}