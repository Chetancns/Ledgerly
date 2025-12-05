import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Category, CategoryType } from "../models/category";
import { getUserCategory, createCategory, onDeleteCategory, updateCategory } from "../services/category";
import { TrashIcon } from "@heroicons/react/24/solid";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import NeumorphicInput from "@/components/NeumorphicInput";
import NeumorphicSelect from "@/components/NeumorphicSelect";
import { on } from "events";
import ModernButton from "@/components/NeumorphicButton";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const categoryTypes = [{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }];
  const load = async () => {
    const res = await getUserCategory();
    setCategories(res);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    if (name.trim() === "") {
      toast.error("Category name is required!");
      return;
    }if(type.trim() === "") {
      toast.error("Category type is required!");
      return;
    }
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
const onCancel = () => {
    setShowModal(false);
    setEditingId(null);
    setName("");
    setType("expense");
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteCategory(id);
      toast.success("Category deleted.");
      await load();
    } catch (err) {
      console.error("Category delete failed", err);
      toast.error("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };
  
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-4">
        {/*<div className="mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">*/}
          <h1 className="text-3xl font-bold text-white mb-6">Categories</h1>

          {/* Add Category Form */}
          
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-6 rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/60">
            <NeumorphicInput
              value={name}
              onChange={setName}
              placeholder="Category Name"
              theme={theme}
              type="text"
            />
            <NeumorphicSelect
              value={type}
              onChange={(val) => setType(val as CategoryType)}
              options={categoryTypes}
              placeholder="Select Category Type"
              theme={theme}
            />
            <ModernButton
              type="submit"
              color="indigo-600"
              variant="solid"
              theme={theme}
            >
              Add Category
            </ModernButton>
            <ModernButton
              type="button"
              onClick={onCancel}
              color="gray-600"
              variant="solid"
              theme={theme}
            >
              Cancel
            </ModernButton>
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
  onClick={() => setDeleteConfirm(c.id)}
  className="text-red-600 hover:text-red-800 transition-transform hover:scale-110"
  title="Delete"
>
  <TrashIcon className="h-5 w-5" />

</button>
                </li>
              ))}
            </ul>
          </div>
        {/*</div>*/}
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
            onClick={onCancel}
            className="bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-700 flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    <ConfirmModal
      open={!!deleteConfirm}
      title="Delete Category"
      description="Delete this category? This action cannot be undone."
      confirmLabel="Delete"
      confirmColor="red-500"
      loading={!!deletingId}
      onConfirm={() => handleDelete(deleteConfirm!)}
      onClose={() => setDeleteConfirm(null)}
    />

    </Layout>
  );
}
