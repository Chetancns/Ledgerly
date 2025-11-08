import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Category, CategoryType } from "../models/category";
import { getUserCategory, createCategory, onDeleteCategory, updateCategory } from "../services/category";
import { TrashIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const res = await getUserCategory();
    setCategories(res);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    if (editingId) {
      await updateCategory(editingId, { name, type });
      toast.success("Category updated!");
      setEditingId(null);
      setShowModal(false);
    } else {
      await createCategory({ name, type });
      toast.success("Category added!");
    }
    setName("");
    setType("expense");
    await load();
  } catch {
    toast.error("Something went wrong!");
  }
};

const openModal = (category: Category) => {
  setEditingId(category.id);
  setName(category.name ?? "");
  setType(category.type ?? "expense");
  setShowModal(true);
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
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
              required
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
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
                  className={`bg-white  p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center transition-opacity duration-300 ${
                    deletingId === c.id ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div>
                    <span className="font-semibold text-gray-800">{c.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({c.type})</span>
                  </div>
                  <button
  onClick={() => openModal(c)}
  className="text-yellow-500 hover:text-yellow-700 transition-transform hover:scale-110 mr-2"
  title="Edit"
>
  ✏️
</button>

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
      {showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 w-full max-w-md">
      <h2 className="text-white text-xl font-bold mb-4">Edit Category</h2>
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <input
          className="p-2 rounded-lg text-black"
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="p-2 rounded-lg text-black"
          value={type}
          onChange={(e) => setType(e.target.value as CategoryType)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-800 flex-1"
          >
            Update
          </button>
          <button
            type="button"
            onClick={() => {
              setShowModal(false);
              setEditingId(null);
            }}
            className="bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-700 flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </Layout>
  );
}
