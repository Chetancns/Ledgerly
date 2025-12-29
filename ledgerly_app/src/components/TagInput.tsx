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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
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
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    const newSelected = selectedTags.filter(t => t.id !== tagId);
    setSelectedTags(newSelected);
    onChange(newSelected.map(t => t.id));
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
      const res = await createTag({ name });
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
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Tag display and input */}
      <div
        className={`flex flex-wrap gap-2 p-3 rounded-lg border ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-300"
        } focus-within:ring-2 focus-within:ring-blue-500 transition-all`}
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
              onClick={() => handleRemoveTag(tag.id)}
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
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ""}
          className={`flex-1 min-w-[120px] bg-transparent outline-none ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={dropdownRef}
          className={`absolute z-10 mt-1 w-full rounded-lg border shadow-lg max-h-60 overflow-auto ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-300"
          }`}
        >
          {filteredTags.length > 0 ? (
            <ul>
              {filteredTags.slice(0, 10).map(tag => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                      theme === "dark"
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className={theme === "dark" ? "text-white" : "text-gray-900"}>
                      {tag.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : inputValue.trim() ? (
            <div className="p-3">
              <button
                type="button"
                onClick={handleCreateTag}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  theme === "dark"
                    ? "hover:bg-gray-700 text-blue-400"
                    : "hover:bg-gray-100 text-blue-600"
                }`}
              >
                <Plus size={16} />
                <span>Create tag &quot;{inputValue.trim()}&quot;</span>
              </button>
            </div>
          ) : (
            <div className={`p-3 text-center text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>
              No tags available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
