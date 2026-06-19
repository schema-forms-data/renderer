import { useState, useRef, useEffect } from "react";
import { useController, type Control } from "react-hook-form";
import type { FieldOption } from "@schema-forms-data/core";
import { ChevronDown, X } from "lucide-react";
import { Input, cn } from "@schema-forms-data/ui";

interface DFAutocompleteProps {
  name: string;
  control: Control<Record<string, unknown>>;
  options: FieldOption[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFAutocomplete = ({
  name,
  control,
  options,
  placeholder,
  disabled,
  readOnly,
}: DFAutocompleteProps) => {
  const { field, fieldState } = useController({ name, control });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = `autocomplete-${name}-listbox`;

  const selectedLabel =
    options.find((o) => o.valor === field.value)?.label ?? "";

  const filtered =
    query.length > 0
      ? options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const closeDropdown = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  };

  // Mantém o item ativo visível ao navegar com teclado
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[id="${listboxId}-option-${activeIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  const handleSelect = (opt: FieldOption) => {
    if (opt.disabled) return;
    field.onChange(opt.valor);
    closeDropdown();
  };

  const handleClear = () => {
    field.onChange("");
    setQuery("");
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (
          activeIndex >= 0 &&
          filtered[activeIndex] &&
          !filtered[activeIndex].disabled
        ) {
          handleSelect(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        closeDropdown();
        break;
    }
  };

  const activeDescendant =
    open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className="space-y-1" ref={containerRef}>
      <div className="relative">
        <Input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          value={open ? query : selectedLabel}
          placeholder={placeholder ?? "Buscar..."}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => !readOnly && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pr-8",
            fieldState.error &&
              "border-destructive focus-visible:ring-destructive",
          )}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {field.value ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
              tabIndex={-1}
              aria-label="Limpar seleção"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown
              size={16}
              className="text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>

        {open && !disabled && !readOnly && (
          <ul
            role="listbox"
            id={listboxId}
            ref={listRef}
            aria-label="Opções disponíveis"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-input bg-popover shadow-lg"
          >
            {filtered.length === 0 ? (
              <li
                role="option"
                aria-selected={false}
                className="px-3 py-2 text-sm text-muted-foreground"
              >
                Nenhuma opção encontrada
              </li>
            ) : (
              filtered.map((opt, index) => (
                <li
                  key={opt.valor}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={field.value === opt.valor}
                  aria-disabled={opt.disabled}
                  onMouseDown={() => handleSelect(opt)}
                  className={[
                    "flex cursor-pointer items-center px-3 py-2 text-sm",
                    opt.disabled
                      ? "cursor-not-allowed opacity-40"
                      : index === activeIndex
                        ? "bg-accent"
                        : "hover:bg-accent",
                    field.value === opt.valor
                      ? "font-medium text-primary"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
};

export default DFAutocomplete;
