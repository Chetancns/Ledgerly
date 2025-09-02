import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Category, CategoryType } from "../models/category";
import { getUserCategory, createCategory, onDeleteCategory } from "../services/category";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    const res = await getUserCategory();
    setCategories(res);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCategory({ name, type });
    setName("");
    setType("expense");
    await load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDeleteCategory(id);
    await load();
    setDeletingId(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2">
        <div className="mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Categories</h1>

          {/* Add Category Form */}
          <form onSubmit={handleCreate} className="mb-6 flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300"
              required
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
              className="px-3 py-2 rounded-lg border border-gray-300"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="savings">Savings</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add
            </button>
          </form>

          {/* List Categories */}
          <div className="rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-4">
            <ul className="flex flex-wrap gap-4 px-4">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className={`bg-white w-[250px] p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center transition-opacity duration-300 ${
                    deletingId === c.id ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div>
                    <span className="font-semibold text-gray-800">{c.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({c.type})</span>
                  </div>
                  <button
  onClick={() => handleDelete(c.id)}
  className="text-red-600 hover:text-red-800 transition-transform hover:scale-110"
  title="Delete"
>
  <TrashIcon className="h-5 w-5" />

</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
