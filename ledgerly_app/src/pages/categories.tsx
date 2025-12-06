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
import { useTheme } from "@/context/ThemeContext";

export default function Categories() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
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
      <div className="min-h-screen py-5 px-4" style={{ color: "var(--text-primary)" }}>
          <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Categories</h1>

          {/* Add Category Form */}
          
          <form 
            onSubmit={handleCreate} 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-6 rounded-xl backdrop-blur-lg"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
            }}
          >
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
          <div 
            className="rounded-2xl shadow-2xl p-4 backdrop-blur-lg"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <ul className="flex flex-wrap gap-4 px-4">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className={`p-4 rounded-lg shadow flex justify-between items-center transition-opacity duration-300 ${
                    deletingId === c.id ? "opacity-0" : "opacity-100"
                  }`}
                  style={{
                    background: "var(--bg-card-hover)",
                    border: "1px solid var(--border-secondary)",
                  }}
                >
                  <div>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>({c.type})</span>
                  </div>
                  <button
  onClick={() => openModal(c)}
  className="hover:scale-110 transition-transform mr-2"
  style={{ color: "var(--accent-primary)" }}
  title="Edit"
>
  ✏️
</button>

                  <button
  onClick={() => setDeleteConfirm(c.id)}
  className="hover:scale-110 transition-transform"
  style={{ color: "var(--color-error)" }}
  title="Delete"
>
  <TrashIcon className="h-5 w-5" />

</button>
                </li>
              ))}
            </ul>
          </div>
      </div>
      {showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div 
      className="backdrop-blur-lg p-6 rounded-xl w-full max-w-md"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Edit Category</h2>
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <input
          className="p-2 rounded-lg"
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            background: "var(--input-bg)",
            color: "var(--input-text)",
            border: "1px solid var(--input-border)",
          }}
        />
        <select
          className="p-2 rounded-lg"
          value={type}
          onChange={(e) => setType(e.target.value as CategoryType)}
          style={{
            background: "var(--input-bg)",
            color: "var(--input-text)",
            border: "1px solid var(--input-border)",
          }}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="p-2 rounded-lg flex-1 font-semibold"
            style={{
              background: "var(--accent-secondary)",
              color: "var(--text-primary)",
            }}
          >
            Update
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg flex-1"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
            }}
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
