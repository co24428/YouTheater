"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ALL, type Library } from "@/lib/types";
import { SortableItem, SortableList } from "./Sortable";

export function LibraryBar({
  libraries,
  selected,
  totalCount,
  onSelect,
  onReorder,
  onCreate,
  onRename,
  onDelete,
}: {
  libraries: Library[];
  selected: string;
  totalCount: number;
  onSelect: (id: string) => void;
  onReorder: (next: Library[]) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  return (
    <div className="border-b border-zinc-800/70 bg-zinc-950">
      <div className="strip mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-4 py-2.5">
        <Chip active={selected === ALL} onClick={() => onSelect(ALL)} label={t.allVideos} count={totalCount} />
        <span className="h-5 w-px shrink-0 bg-zinc-800" />

        <SortableList items={libraries} onReorder={onReorder}>
          {libraries.map((lib) => (
            <SortableItem key={lib.id} id={lib.id} className="relative shrink-0">
              {renaming === lib.id ? (
                <InlineInput
                  initial={lib.name}
                  onCancel={() => setRenaming(null)}
                  onSubmit={async (name) => {
                    await onRename(lib.id, name);
                    setRenaming(null);
                  }}
                />
              ) : (
                <Chip
                  active={selected === lib.id}
                  onClick={() => onSelect(lib.id)}
                  label={lib.name}
                  count={lib.video_count}
                  onMenu={selected === lib.id ? () => setMenu(menu === lib.id ? null : lib.id) : undefined}
                />
              )}
            </SortableItem>
          ))}
        </SortableList>

        {creating ? (
          <InlineInput
            placeholder={t.libraryName}
            onCancel={() => setCreating(false)}
            onSubmit={async (name) => {
              await onCreate(name);
              setCreating(false);
            }}
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="shrink-0 rounded-full border border-dashed border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            + {t.newLibrary}
          </button>
        )}
      </div>

      {menu && (
        <LibraryMenu
          onClose={() => setMenu(null)}
          manageHref={`/library/${menu}`}
          onRename={() => {
            setRenaming(menu);
            setMenu(null);
          }}
          onDelete={async () => {
            const id = menu;
            setMenu(null);
            if (confirm(t.confirmDeleteLibrary)) await onDelete(id);
          }}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  onMenu,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  onMenu?: () => void;
}) {
  return (
    <div
      className={`flex shrink-0 items-center rounded-full border text-sm transition ${
        active ? "border-accent bg-accent/15 text-white" : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      <button onClick={onClick} className="flex items-center gap-1.5 py-1 pl-3 pr-3">
        <span className="max-w-[16ch] truncate">{label}</span>
        <span className="text-xs text-zinc-500">{count}</span>
      </button>
      {onMenu && (
        <button onClick={onMenu} className="-ml-1.5 rounded-full py-1 pl-1 pr-2.5 text-zinc-400 hover:text-white" aria-label="Library menu">
          ⋯
        </button>
      )}
    </div>
  );
}

function LibraryMenu({
  onClose,
  manageHref,
  onRename,
  onDelete,
}: {
  onClose: () => void;
  manageHref: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-[1600px] gap-2 px-4 pb-2.5 text-sm">
      <Link href={manageHref} className="rounded-md bg-zinc-800 px-3 py-1 hover:bg-zinc-700">
        ⚙ {t.manage}
      </Link>
      <button onClick={onRename} className="rounded-md bg-zinc-800 px-3 py-1 hover:bg-zinc-700">
        ✎ {t.rename}
      </button>
      <button onClick={onDelete} className="rounded-md bg-zinc-800 px-3 py-1 text-red-300 hover:bg-red-900/50">
        🗑 {t.delete}
      </button>
      <button onClick={onClose} className="px-2 text-zinc-500 hover:text-zinc-300">
        ✕
      </button>
    </div>
  );
}

export function InlineInput({
  initial = "",
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  placeholder?: string;
  onSubmit: (v: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.select(), []);
  return (
    <form
      className="shrink-0"
      onSubmit={async (e) => {
        e.preventDefault();
        if (v.trim()) await onSubmit(v.trim());
      }}
    >
      <input
        ref={ref}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation(); // don't let dnd-kit's keyboard sensor eat keys
          if (e.key === "Escape") onCancel();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={onCancel}
        className="w-44 rounded-full border border-accent bg-zinc-900 px-3 py-1 text-sm outline-none"
      />
    </form>
  );
}
