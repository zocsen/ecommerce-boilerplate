"use client";

/* ------------------------------------------------------------------ */
/*  Admin image upload components                                      */
/*                                                                     */
/*  SingleImageUpload — drag-and-drop / click-to-browse for one image  */
/*  GalleryImageUpload — same for multiple gallery images              */
/*                                                                     */
/*  Both call the `uploadProductImage` server action, then surface     */
/*  the resulting public URL via their `onChange` callbacks so the      */
/*  parent form continues to work with plain URL strings.              */
/* ------------------------------------------------------------------ */

import { useReducer, useRef, useCallback } from "react";
import {
  Upload,
  ImagePlus,
  Loader2,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  GripVertical,
} from "lucide-react";
import Image from "next/image";
import { uploadProductImage, deleteProductImage } from "@/lib/actions/images";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Shared constants                                                   */
/* ------------------------------------------------------------------ */

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Nem támogatott formátum. Engedélyezett: JPEG, PNG, WebP, AVIF.";
  }
  if (file.size > MAX_SIZE) {
    return "A fájl mérete meghaladja az 5 MB-os limitet.";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  ImagePreview — shared thumbnail + action buttons                   */
/*                                                                     */
/*  Used by both SingleImageUpload and GalleryImageUpload so every     */
/*  image preview has the same max-w-xs width and always-visible       */
/*  Csere / Törlés buttons beneath the thumbnail.                      */
/* ------------------------------------------------------------------ */

interface ImagePreviewProps {
  url: string;
  alt: string;
  /** Fires when the user wants to replace the image via file picker. */
  onReplace: () => void;
  onRemove: () => void;
  uploading: boolean;
  deleting: boolean;
  /** If provided, renders a position badge on the thumbnail. */
  position?: number;
  /** If true, renders a drag-handle icon on the thumbnail. */
  showDragHandle?: boolean;
  /** Extra className for the outermost wrapper (used for drag state). */
  className?: string;
  /** Drag event handlers forwarded from the gallery. */
  dragHandlers?: {
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}

function ImagePreview({
  url,
  alt,
  onReplace,
  onRemove,
  uploading,
  deleting,
  position,
  showDragHandle,
  className,
  dragHandlers,
}: ImagePreviewProps) {
  return (
    <div
      className={["w-full max-w-xs space-y-2", className].filter(Boolean).join(" ")}
      draggable={showDragHandle}
      {...dragHandlers}
    >
      <div
        className="bg-muted relative w-full overflow-hidden rounded-lg border"
        style={{ aspectRatio: "1/1" }}
      >
        <Image
          src={url}
          alt={alt}
          fill
          className="pointer-events-none object-cover"
          sizes="320px"
          unoptimized={!url.startsWith("/")}
        />

        {/* Drag handle badge (gallery only) */}
        {showDragHandle && (
          <div className="absolute top-1 left-1 flex size-5 cursor-grab items-center justify-center rounded-full bg-black/70 text-white active:cursor-grabbing">
            <GripVertical className="size-3" />
          </div>
        )}

        {/* Position badge (gallery only) */}
        {position !== undefined && (
          <div className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-medium text-white">
            {position}
          </div>
        )}
      </div>

      {/* Always-visible action buttons below the image */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            onReplace();
          }}
          disabled={uploading || deleting}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 size-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 size-3" />
          )}
          Csere
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={uploading || deleting}
        >
          {deleting ? (
            <Loader2 className="mr-1.5 size-3 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 size-3" />
          )}
          Törlés
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SingleImageUpload                                                  */
/* ------------------------------------------------------------------ */

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}

interface SingleState {
  uploading: boolean;
  deleting: boolean;
  dragOver: boolean;
  error: string | null;
  showUrlInput: boolean;
  urlInputValue: string;
}

type SingleAction =
  | { type: "START_UPLOAD" }
  | { type: "UPLOAD_DONE" }
  | { type: "START_DELETE" }
  | { type: "DELETE_DONE" }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_DRAG"; over: boolean }
  | { type: "TOGGLE_URL_INPUT" }
  | { type: "SET_URL_INPUT"; value: string }
  | { type: "RESET_URL_INPUT" };

function singleReducer(state: SingleState, action: SingleAction): SingleState {
  switch (action.type) {
    case "START_UPLOAD":
      return { ...state, uploading: true, error: null };
    case "UPLOAD_DONE":
      return { ...state, uploading: false };
    case "START_DELETE":
      return { ...state, deleting: true, error: null };
    case "DELETE_DONE":
      return { ...state, deleting: false };
    case "SET_ERROR":
      return { ...state, error: action.error, uploading: false, deleting: false };
    case "SET_DRAG":
      return { ...state, dragOver: action.over };
    case "TOGGLE_URL_INPUT":
      return { ...state, showUrlInput: !state.showUrlInput, urlInputValue: "" };
    case "SET_URL_INPUT":
      return { ...state, urlInputValue: action.value };
    case "RESET_URL_INPUT":
      return { ...state, showUrlInput: false, urlInputValue: "" };
    default:
      return state;
  }
}

export function SingleImageUpload({ value, onChange, onRemove }: SingleImageUploadProps) {
  const [state, dispatch] = useReducer(singleReducer, {
    uploading: false,
    deleting: false,
    dragOver: false,
    error: null,
    showUrlInput: false,
    urlInputValue: "",
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        dispatch({ type: "SET_ERROR", error: validationError });
        return;
      }

      dispatch({ type: "START_UPLOAD" });

      // If replacing an existing image, delete the old one from storage first
      if (value) {
        await deleteProductImage(value);
      }

      const fd = new FormData();
      fd.set("file", file);

      const result = await uploadProductImage(fd);

      if (result.success) {
        onChange(result.url);
        dispatch({ type: "UPLOAD_DONE" });
      } else {
        dispatch({ type: "SET_ERROR", error: result.error });
      }
    },
    [onChange, value],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dispatch({ type: "SET_DRAG", over: false });

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input so re-selecting the same file triggers change
      e.target.value = "";
    },
    [handleUpload],
  );

  const applyUrl = useCallback(() => {
    const url = state.urlInputValue.trim();
    if (url) {
      onChange(url);
      dispatch({ type: "RESET_URL_INPUT" });
    }
  }, [state.urlInputValue, onChange]);

  const handleRemove = useCallback(async () => {
    dispatch({ type: "START_DELETE" });
    await deleteProductImage(value);
    dispatch({ type: "DELETE_DONE" });
    onRemove();
  }, [value, onRemove]);

  // ── Has image — show preview ───────────────────────────────────
  if (value) {
    return (
      <div className="space-y-2">
        <ImagePreview
          url={value}
          alt="Fő kép"
          onReplace={() => inputRef.current?.click()}
          onRemove={handleRemove}
          uploading={state.uploading}
          deleting={state.deleting}
        />

        {state.error && <p className="text-destructive text-xs">{state.error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // ── No image — show drop zone ──────────────────────────────────
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          dispatch({ type: "SET_DRAG", over: true });
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dispatch({ type: "SET_DRAG", over: true });
        }}
        onDragLeave={() => dispatch({ type: "SET_DRAG", over: false })}
        onDrop={handleDrop}
        disabled={state.uploading}
        className={[
          "flex w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-all duration-300",
          state.dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
          state.uploading ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        {state.uploading ? (
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-8" />
        )}
        <div className="text-center">
          <p className="text-muted-foreground text-sm font-medium">
            {state.uploading
              ? "Feltöltés folyamatban..."
              : "Húzza ide a képet vagy kattintson a tallózáshoz"}
          </p>
          <p className="text-muted-foreground/70 mt-1 text-xs">JPEG, PNG, WebP, AVIF — max. 5 MB</p>
        </div>
      </button>

      {state.error && <p className="text-destructive text-xs">{state.error}</p>}

      {/* Manual URL entry toggle */}
      <div>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_URL_INPUT" })}
          className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs transition-colors"
        >
          <LinkIcon className="size-3" />
          URL megadása
        </button>

        {state.showUrlInput && (
          <div className="mt-2 flex gap-2">
            <Input
              type="url"
              value={state.urlInputValue}
              onChange={(e) => dispatch({ type: "SET_URL_INPUT", value: e.target.value })}
              placeholder="https://..."
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyUrl();
                }
              }}
            />
            <Button type="button" variant="outline" size="xs" onClick={applyUrl}>
              OK
            </Button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GalleryImageUpload                                                 */
/* ------------------------------------------------------------------ */

interface GalleryImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

interface GalleryState {
  uploading: boolean;
  uploadProgress: string; // e.g. "2 / 5"
  deleting: number | null; // index being deleted
  replacing: number | null; // index being replaced
  dragOver: boolean;
  reorderDragIndex: number | null;
  reorderOverIndex: number | null;
  error: string | null;
  showUrlInput: boolean;
  urlInputValue: string;
}

type GalleryAction =
  | { type: "START_UPLOAD"; total: number }
  | { type: "UPLOAD_PROGRESS"; current: number; total: number }
  | { type: "UPLOAD_DONE" }
  | { type: "START_DELETE"; index: number }
  | { type: "DELETE_DONE" }
  | { type: "START_REPLACE"; index: number }
  | { type: "REPLACE_DONE" }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_DRAG"; over: boolean }
  | { type: "REORDER_START"; index: number }
  | { type: "REORDER_OVER"; index: number }
  | { type: "REORDER_END" }
  | { type: "TOGGLE_URL_INPUT" }
  | { type: "SET_URL_INPUT"; value: string }
  | { type: "RESET_URL_INPUT" };

function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case "START_UPLOAD":
      return { ...state, uploading: true, error: null, uploadProgress: `0 / ${action.total}` };
    case "UPLOAD_PROGRESS":
      return { ...state, uploadProgress: `${action.current} / ${action.total}` };
    case "UPLOAD_DONE":
      return { ...state, uploading: false, uploadProgress: "" };
    case "START_DELETE":
      return { ...state, deleting: action.index, error: null };
    case "DELETE_DONE":
      return { ...state, deleting: null };
    case "START_REPLACE":
      return { ...state, replacing: action.index, error: null };
    case "REPLACE_DONE":
      return { ...state, replacing: null };
    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        uploading: false,
        deleting: null,
        replacing: null,
        uploadProgress: "",
      };
    case "SET_DRAG":
      return { ...state, dragOver: action.over };
    case "REORDER_START":
      return { ...state, reorderDragIndex: action.index };
    case "REORDER_OVER":
      return { ...state, reorderOverIndex: action.index };
    case "REORDER_END":
      return { ...state, reorderDragIndex: null, reorderOverIndex: null };
    case "TOGGLE_URL_INPUT":
      return { ...state, showUrlInput: !state.showUrlInput, urlInputValue: "" };
    case "SET_URL_INPUT":
      return { ...state, urlInputValue: action.value };
    case "RESET_URL_INPUT":
      return { ...state, showUrlInput: false, urlInputValue: "" };
    default:
      return state;
  }
}

export function GalleryImageUpload({ value, onChange }: GalleryImageUploadProps) {
  const [state, dispatch] = useReducer(galleryReducer, {
    uploading: false,
    uploadProgress: "",
    deleting: null,
    replacing: null,
    dragOver: false,
    reorderDragIndex: null,
    reorderOverIndex: null,
    error: null,
    showUrlInput: false,
    urlInputValue: "",
  });

  const addInputRef = useRef<HTMLInputElement>(null);
  /** Per-item hidden file inputs keyed by index, used for the "Csere" action. */
  const replaceInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const handleUploadMultiple = useCallback(
    async (files: File[]) => {
      // Validate all first
      const errors: string[] = [];
      const valid: File[] = [];

      for (const file of files) {
        const err = validateFile(file);
        if (err) {
          errors.push(`${file.name}: ${err}`);
        } else {
          valid.push(file);
        }
      }

      if (valid.length === 0) {
        dispatch({ type: "SET_ERROR", error: errors[0] ?? "Nincs érvényes fájl." });
        return;
      }

      dispatch({ type: "START_UPLOAD", total: valid.length });

      const newUrls: string[] = [];
      const uploadErrors: string[] = [];

      for (let i = 0; i < valid.length; i++) {
        dispatch({ type: "UPLOAD_PROGRESS", current: i + 1, total: valid.length });

        const fd = new FormData();
        fd.set("file", valid[i]);

        const result = await uploadProductImage(fd);

        if (result.success) {
          newUrls.push(result.url);
        } else {
          uploadErrors.push(`${valid[i].name}: ${result.error}`);
        }
      }

      // Add successfully uploaded URLs to existing list
      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
      }

      if (uploadErrors.length > 0) {
        dispatch({
          type: "SET_ERROR",
          error: `${uploadErrors.length} kép feltöltése sikertelen.`,
        });
      } else {
        dispatch({ type: "UPLOAD_DONE" });
      }

      // Also show pre-validation errors
      if (errors.length > 0 && uploadErrors.length === 0) {
        dispatch({
          type: "SET_ERROR",
          error: errors[0],
        });
      }
    },
    [value, onChange],
  );

  /** Replace a single gallery image at `index` with a new file. */
  const handleReplace = useCallback(
    async (index: number, file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        dispatch({ type: "SET_ERROR", error: validationError });
        return;
      }

      dispatch({ type: "START_REPLACE", index });

      // Delete old image from storage
      await deleteProductImage(value[index]);

      const fd = new FormData();
      fd.set("file", file);

      const result = await uploadProductImage(fd);

      if (result.success) {
        const updated = [...value];
        updated[index] = result.url;
        onChange(updated);
        dispatch({ type: "REPLACE_DONE" });
      } else {
        dispatch({ type: "SET_ERROR", error: result.error });
      }
    },
    [value, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dispatch({ type: "SET_DRAG", over: false });
      dispatch({ type: "REORDER_END" });

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleUploadMultiple(files);
      }
    },
    [handleUploadMultiple],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        handleUploadMultiple(files);
      }
      e.target.value = "";
    },
    [handleUploadMultiple],
  );

  const removeImage = useCallback(
    async (index: number) => {
      const url = value[index];
      dispatch({ type: "START_DELETE", index });
      await deleteProductImage(url);
      dispatch({ type: "DELETE_DONE" });
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const handleReorderDrop = useCallback(
    (dropIndex: number) => {
      const dragIndex = state.reorderDragIndex;
      if (dragIndex === null || dragIndex === dropIndex) {
        dispatch({ type: "REORDER_END" });
        return;
      }
      const reordered = [...value];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      onChange(reordered);
      dispatch({ type: "REORDER_END" });
    },
    [state.reorderDragIndex, value, onChange],
  );

  const applyUrl = useCallback(() => {
    const url = state.urlInputValue.trim();
    if (url && !value.includes(url)) {
      onChange([...value, url]);
      dispatch({ type: "RESET_URL_INPUT" });
    }
  }, [state.urlInputValue, value, onChange]);

  return (
    <div className="space-y-4">
      {/* Existing images — same preview card as the main image */}
      {value.length > 0 && (
        <div className="space-y-4">
          {value.map((url, i) => {
            const isDragging = state.reorderDragIndex === i;
            const isOver = state.reorderOverIndex === i;
            const isDeleting = state.deleting === i;
            const isReplacing = state.replacing === i;

            return (
              <div key={`${url}-${i}`}>
                <ImagePreview
                  url={url}
                  alt={`Galéria kép ${i + 1}`}
                  onReplace={() => replaceInputRefs.current.get(i)?.click()}
                  onRemove={() => removeImage(i)}
                  uploading={isReplacing}
                  deleting={isDeleting}
                  position={i + 1}
                  showDragHandle
                  className={[
                    "transition-all duration-200",
                    isDragging ? "scale-95 opacity-40" : "",
                    isOver && !isDragging ? "ring-primary rounded-lg ring-2 ring-offset-2" : "",
                    isDeleting ? "pointer-events-none opacity-60" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  dragHandlers={{
                    onDragStart: (e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(i));
                      dispatch({ type: "REORDER_START", index: i });
                    },
                    onDragOver: (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (state.reorderDragIndex !== null) {
                        dispatch({ type: "REORDER_OVER", index: i });
                      }
                    },
                    onDragLeave: () => {
                      if (state.reorderOverIndex === i) {
                        dispatch({ type: "REORDER_OVER", index: -1 });
                      }
                    },
                    onDrop: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReorderDrop(i);
                    },
                    onDragEnd: () => dispatch({ type: "REORDER_END" }),
                  }}
                />

                {/* Hidden per-item file input for replacement */}
                <input
                  ref={(el) => {
                    if (el) {
                      replaceInputRefs.current.set(i, el);
                    } else {
                      replaceInputRefs.current.delete(i);
                    }
                  }}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleReplace(i, file);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Reorder hint */}
      {value.length > 1 && (
        <p className="text-muted-foreground/60 text-xs">Húzd a képeket a sorrend módosításához.</p>
      )}

      {/* Drop zone for adding new images */}
      <button
        type="button"
        onClick={() => addInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          dispatch({ type: "SET_DRAG", over: true });
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dispatch({ type: "SET_DRAG", over: true });
        }}
        onDragLeave={() => dispatch({ type: "SET_DRAG", over: false })}
        onDrop={handleDrop}
        disabled={state.uploading}
        className={[
          "flex w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-5 transition-all duration-300",
          state.dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
          state.uploading ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        {state.uploading ? (
          <>
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-xs">Feltöltés: {state.uploadProgress}</p>
          </>
        ) : (
          <>
            <ImagePlus className="text-muted-foreground size-6" />
            <p className="text-muted-foreground text-xs">
              Képek hozzáadása — húzza ide vagy kattintson
            </p>
          </>
        )}
      </button>

      {state.error && <p className="text-destructive text-xs">{state.error}</p>}

      {/* Manual URL entry */}
      <div>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_URL_INPUT" })}
          className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs transition-colors"
        >
          <LinkIcon className="size-3" />
          URL megadása
        </button>

        {state.showUrlInput && (
          <div className="mt-2 flex gap-2">
            <Input
              type="url"
              value={state.urlInputValue}
              onChange={(e) => dispatch({ type: "SET_URL_INPUT", value: e.target.value })}
              placeholder="https://..."
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyUrl();
                }
              }}
            />
            <Button type="button" variant="outline" size="xs" onClick={applyUrl}>
              OK
            </Button>
          </div>
        )}
      </div>

      <input
        ref={addInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
