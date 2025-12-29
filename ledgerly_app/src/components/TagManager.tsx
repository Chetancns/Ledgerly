import { useState, useEffect } from "react";
import { Tag, Pencil, Trash2, Plus, X, RotateCcw, Merge as MergeIcon } from "lucide-react";
import {
  getAllTags,
  getTagsWithUsage,
  createTag,
  updateTag,
  deleteTag,
  restoreTag,
  mergeTags,
  TagWithUsage,
} from "@/services/tags";
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";
import ConfirmModal from "./ConfirmModal";

interface TagManagerProps {
  onClose?: () => void;
}

export default function TagManager({ onClose }: TagManagerProps) {
  const { theme } = useTheme();
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
    description: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<TagWithUsage | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [targetForMerge, setTargetForMerge] = useState<string>("");

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const res = await getTagsWithUsage();
      setTags(res.data);
    } catch (error) {
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Tag name is required");
      return;
    }

    try {
      await createTag(formData);
      toast.success(`Tag "${formData.name}" created`);
      setFormData({ name: "", color: "#3B82F6", description: "" });
      setShowCreateForm(false);
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create tag");
    }
  };

  const handleUpdate = async () => {
    if (!editingTag) return;

    try {
      await updateTag(editingTag.id, formData);
      toast.success(`Tag "${formData.name}" updated`);
      setEditingTag(null);
      setFormData({ name: "", color: "#3B82F6", description: "" });
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update tag");
    }
  };

  const handleDelete = async (tag: TagWithUsage) => {
    try {
      await deleteTag(tag.id);
      toast.success(`Tag "${tag.name}" deleted`);
      setDeleteConfirm(null);
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete tag");
    }
  };

  const handleRestore = async (tag: TagWithUsage) => {
    try {
      await restoreTag(tag.id);
      toast.success(`Tag "${tag.name}" restored`);
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to restore tag");
    }
  };

  const handleMerge = async () => {
    if (selectedForMerge.length === 0 || !targetForMerge) {
      toast.error("Please select source tags and a target tag");
      return;
    }

    if (selectedForMerge.includes(targetForMerge)) {
      toast.error("Target tag cannot be in the source tags list");
      return;
    }

    try {
      await mergeTags({ sourceTagIds: selectedForMerge, targetTagId: targetForMerge });
      toast.success("Tags merged successfully");
      setMergeMode(false);
      setSelectedForMerge([]);
      setTargetForMerge("");
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to merge tags");
    }
  };

  const startEdit = (tag: TagWithUsage) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setShowCreateForm(false);
    setFormData({ name: "", color: "#3B82F6", description: "" });
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-lg shadow-xl ${
        theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Tag size={24} />
          Manage Tags
        </h2>
        <div className="flex gap-2">
          {!mergeMode && (
            <button
              onClick={() => setMergeMode(true)}
              className="px-4 py-2 rounded-md bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2"
            >
              <MergeIcon size={16} />
              Merge Tags
            </button>
          )}
          {mergeMode && (
            <button
              onClick={() => {
                setMergeMode(false);
                setSelectedForMerge([]);
                setTargetForMerge("");
              }}
              className="px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition-colors"
            >
              Cancel Merge
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              showCreateForm
                ? "bg-gray-500 hover:bg-gray-600"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white`}
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? "Cancel" : "New Tag"}
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingTag) && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-100"
          }`}
        >
          <h3 className="text-lg font-semibold mb-4">
            {editingTag ? "Edit Tag" : "Create New Tag"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tag Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tag name"
                className={`w-full px-3 py-2 rounded-md border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-md cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter tag description"
                className={`w-full px-3 py-2 rounded-md border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingTag ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                {editingTag ? "Update" : "Create"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Mode Instructions */}
      {mergeMode && (
        <div
          className={`mb-4 p-4 rounded-lg border-2 ${
            theme === "dark"
              ? "bg-purple-900/20 border-purple-500"
              : "bg-purple-100 border-purple-400"
          }`}
        >
          <p className="text-sm font-medium mb-2">Merge Mode Active:</p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Select the tags you want to merge (source tags)</li>
            <li>Click on the target tag (where all transactions will be moved)</li>
            <li>Click &quot;Merge Selected Tags&quot; to complete</li>
          </ol>
          {selectedForMerge.length > 0 && (
            <div className="mt-3">
              <p className="text-sm">
                Selected {selectedForMerge.length} tag(s) to merge
              </p>
              {targetForMerge && (
                <button
                  onClick={handleMerge}
                  className="mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
                >
                  Merge Selected Tags
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`p-4 rounded-lg border transition-all ${
              mergeMode && selectedForMerge.includes(tag.id)
                ? "border-purple-500 bg-purple-500/10"
                : mergeMode && targetForMerge === tag.id
                ? "border-green-500 bg-green-500/10"
                : theme === "dark"
                ? "bg-gray-700 border-gray-600 hover:border-gray-500"
                : "bg-gray-50 border-gray-300 hover:border-gray-400"
            } ${mergeMode ? "cursor-pointer" : ""}`}
            onClick={() => {
              if (mergeMode) {
                if (targetForMerge === tag.id) {
                  setTargetForMerge("");
                } else if (selectedForMerge.includes(tag.id)) {
                  setSelectedForMerge(selectedForMerge.filter((id) => id !== tag.id));
                } else {
                  if (targetForMerge) {
                    setSelectedForMerge([...selectedForMerge, tag.id]);
                  } else {
                    setTargetForMerge(tag.id);
                  }
                }
              }
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <h3 className="font-semibold text-lg">{tag.name}</h3>
              </div>
              {!mergeMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(tag)}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                    title="Edit tag"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(tag)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                    title="Delete tag"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            {tag.description && (
              <p className={`text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {tag.description}
              </p>
            )}
            <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Used in {tag.usageCount} transaction{tag.usageCount !== 1 ? "s" : ""}
            </div>
            {mergeMode && targetForMerge === tag.id && (
              <div className="mt-2 text-sm font-medium text-green-500">
                ✓ Target tag (keep this)
              </div>
            )}
            {mergeMode && selectedForMerge.includes(tag.id) && (
              <div className="mt-2 text-sm font-medium text-purple-500">
                ✓ Will be merged into target
              </div>
            )}
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="text-center py-12">
          <Tag size={48} className="mx-auto mb-4 opacity-50" />
          <p className={`text-lg ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            No tags yet. Create one to get started!
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          open={!!deleteConfirm}
          title="Delete Tag"
          description={`Are you sure you want to delete "${deleteConfirm.name}"? This tag will be removed from all ${deleteConfirm.usageCount} transaction(s).`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          confirmLabel="Delete"
          confirmColor="red-500"
        />
      )}
    </div>
  );
}
