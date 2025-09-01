import api from "./api";

export async function getUserCategory() {
    const res = await api.get("categories/categoryuser");
    console.log(res);
    return res.data;
}