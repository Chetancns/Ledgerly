import { useState, useEffect, useRef } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { getAllTags, createTag, Tag } from "@/services/tags";
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";

interface TagInputProps {
  value: string[]; // Array of tag IDs
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function TagInput({ value, onChange, placeholder = "Add tags...", className = "" }: TagInputProps) {
  const { theme } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load all tags on mount
  useEffect(() => {
    loadTags();
  }, []);

  // Sync selected tags with value prop
  useEffect(() => {
    if (value && value.length > 0) {
      const selected = tags.filter(tag => value.includes(tag.id));
      setSelectedTags(selected);
    } else {
      setSelectedTags([]);
    }
  }, [value, tags]);

  // Filter tags based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const query = inputValue.toLowerCase();
      const filtered = tags.filter(
        tag =>
          !selectedTags.some(s => s.id === tag.id) &&
          tag.name.toLowerCase().includes(query)
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(tags.filter(tag => !selectedTags.some(s => s.id === tag.id)));
    }
  }, [inputValue, tags, selectedTags]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setShowPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadTags = async () => {
    try {
      const res = await getAllTags(false);
      setTags(res.data);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  };

  const handleSelectTag = (tag: Tag) => {
    const newSelected = [...selectedTags, tag];
    setSelectedTags(newSelected);
    onChange(newSelected.map(t => t.id));
    setInputValue("");
    setShowPanel(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    const newSelected = selectedTags.filter(t => t.id !== tagId);
    setSelectedTags(newSelected);
    onChange(newSelected.map(t => t.id));
  };

  const generateRandomColor = () => {
    const colors = [
      "#3B82F6", // blue
      "#10B981", // green
      "#F59E0B", // amber
      "#EF4444", // red
      "#8B5CF6", // purple
      "#EC4899", // pink
      "#14B8A6", // teal
      "#F97316", // orange
      "#06B6D4", // cyan
      "#84CC16", // lime
      "#A855F7", // violet
      "#F43F5E", // rose
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCreateTag = async () => {
    const name = inputValue.trim();
    if (!name) return;

    // Check if tag already exists
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      toast.error(`Tag "${name}" already exists`);
      return;
    }

    try {
      const res = await createTag({ name, color: generateRandomColor() });
      const newTag = res.data;
      setTags([...tags, newTag]);
      handleSelectTag(newTag);
      toast.success(`Tag "${name}" created`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create tag");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTags.length > 0) {
        handleSelectTag(filteredTags[0]);
      } else if (inputValue.trim()) {
        handleCreateTag();
      }
    } else if (e.key === "Backspace" && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    } else if (e.key === "Escape") {
      setShowPanel(false);
    }
  };

  const handleContainerClick = () => {
    setShowPanel(true);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative z-10 ${className}`}>
      {/* Tag display and input container */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`flex flex-wrap gap-2 p-3 rounded-lg border cursor-text ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-300"
        } ${showPanel ? "ring-2 ring-blue-500" : ""} transition-all`}
      >
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
              border: `1px solid ${tag.color}40`,
            }}
          >
            <TagIcon size={14} />
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              className="ml-1 hover:opacity-70 transition-opacity"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ""}
          className={`flex-1 min-w-[120px] bg-transparent outline-none ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        />
      </div>

      {/* Tag selection panel with absolute positioning */}
      {showPanel && (
        <div
          ref={panelRef}
          className={`absolute left-0 top-full mt-2 w-full z-[9999] rounded-lg border shadow-2xl p-4 max-h-80 overflow-auto ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-300"
          }`}
        >
          {filteredTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    theme === "dark"
                      ? "border-gray-600 hover:bg-gray-700 hover:border-blue-500"
                      : "border-gray-300 hover:bg-gray-100 hover:border-blue-500"
                  }`}
                  style={{
                    backgroundColor: theme === "dark" ? `${tag.color}10` : `${tag.color}05`,
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className={`text-sm font-medium whitespace-nowrap ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {tag.name}
                  </span>
                </button>
              ))}
            </div>
          ) : inputValue.trim() ? (
            <button
              type="button"
              onClick={handleCreateTag}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors ${
                theme === "dark"
                  ? "border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  : "border-blue-500 text-blue-600 hover:bg-blue-50"
              }`}
            >
              <Plus size={18} />
              <span className="font-medium">Create tag &quot;{inputValue.trim()}&quot;</span>
            </button>
          ) : (
            <div className={`text-center py-8 text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>
              <TagIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p>No tags available</p>
              <p className="text-xs mt-1">Type to create a new tag</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
