"use client";

/* ------------------------------------------------------------------ */
/*  OrderNotes — Internal admin notes section (FE-018)                 */
/* ------------------------------------------------------------------ */

import { useReducer, useEffect, useCallback } from "react";
import { Trash2, MessageSquarePlus } from "lucide-react";
import { getOrderNotes, addOrderNote, deleteOrderNote } from "@/lib/actions/orders";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderNoteWithAuthor } from "@/lib/types/database";

/* ── State management (useReducer to avoid lint rule issues) ─────── */

interface NotesState {
  notes: OrderNoteWithAuthor[];
  loading: boolean;
  submitting: boolean;
  deleting: string | null;
  content: string;
  error: string | null;
  confirmDelete: string | null;
}

type NotesAction =
  | { type: "SET_NOTES"; notes: OrderNoteWithAuthor[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "SET_DELETING"; noteId: string | null }
  | { type: "SET_CONTENT"; content: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_CONFIRM_DELETE"; noteId: string | null }
  | { type: "ADD_NOTE"; note: OrderNoteWithAuthor }
  | { type: "REMOVE_NOTE"; noteId: string };

function notesReducer(state: NotesState, action: NotesAction): NotesState {
  switch (action.type) {
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };
    case "SET_DELETING":
      return { ...state, deleting: action.noteId };
    case "SET_CONTENT":
      return { ...state, content: action.content };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_CONFIRM_DELETE":
      return { ...state, confirmDelete: action.noteId };
    case "ADD_NOTE":
      return {
        ...state,
        notes: [action.note, ...state.notes],
        content: "",
      };
    case "REMOVE_NOTE":
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.noteId),
        confirmDelete: null,
      };
    default:
      return state;
  }
}

const initialState: NotesState = {
  notes: [],
  loading: true,
  submitting: false,
  deleting: null,
  content: "",
  error: null,
  confirmDelete: null,
};

const MAX_CHARS = 2000;

/* ── Component ──────────────────────────────────────────────────── */

interface OrderNotesProps {
  orderId: string;
  currentUserId: string;
  isReadOnly: boolean;
}

export function OrderNotes({ orderId, currentUserId, isReadOnly }: OrderNotesProps) {
  const [state, dispatch] = useReducer(notesReducer, initialState);

  const fetchNotes = useCallback(async () => {
    const result = await getOrderNotes(orderId);
    if (result.success && result.data) {
      dispatch({ type: "SET_NOTES", notes: result.data });
    } else {
      dispatch({ type: "SET_ERROR", error: result.error ?? "Hiba a betöltéskor." });
    }
    dispatch({ type: "SET_LOADING", loading: false });
  }, [orderId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleAdd() {
    const trimmed = state.content.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) return;

    dispatch({ type: "SET_SUBMITTING", submitting: true });
    dispatch({ type: "SET_ERROR", error: null });

    const result = await addOrderNote(orderId, trimmed);
    if (result.success && result.data) {
      dispatch({ type: "ADD_NOTE", note: result.data });
    } else {
      dispatch({ type: "SET_ERROR", error: result.error ?? "Hiba a mentéskor." });
    }
    dispatch({ type: "SET_SUBMITTING", submitting: false });
  }

  async function handleDelete(noteId: string) {
    dispatch({ type: "SET_DELETING", noteId });
    const result = await deleteOrderNote(noteId);
    if (result.success) {
      dispatch({ type: "REMOVE_NOTE", noteId });
    } else {
      dispatch({ type: "SET_ERROR", error: result.error ?? "Hiba a törléskor." });
    }
    dispatch({ type: "SET_DELETING", noteId: null });
  }

  const charsRemaining = MAX_CHARS - state.content.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="size-4" />
          Belső megjegyzések
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}

        {/* Add note form — admin only, not read-only */}
        {!isReadOnly && (
          <div className="space-y-2">
            <Textarea
              placeholder="Megjegyzés hozzáadása..."
              value={state.content}
              onChange={(e) => dispatch({ type: "SET_CONTENT", content: e.target.value })}
              maxLength={MAX_CHARS}
              rows={3}
              disabled={state.submitting}
              className="min-h-20 text-sm"
            />
            <div className="flex items-center justify-between">
              <span
                className={`text-xs tabular-nums ${
                  charsRemaining < 100 ? "text-amber-600" : "text-muted-foreground"
                }`}
              >
                {charsRemaining} / {MAX_CHARS}
              </span>
              <Button
                size="sm"
                disabled={
                  state.submitting ||
                  state.content.trim().length === 0 ||
                  state.content.length > MAX_CHARS
                }
                onClick={handleAdd}
              >
                {state.submitting ? "Mentés..." : "Hozzáadás"}
              </Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {state.loading && <p className="text-xs text-muted-foreground">Betöltés...</p>}

        {/* Notes list — reverse chronological */}
        {!state.loading && state.notes.length === 0 && (
          <p className="text-xs text-muted-foreground">Még nincsenek belső megjegyzések.</p>
        )}

        {!state.loading &&
          state.notes.map((note) => {
            const isOwn = note.author_id === currentUserId;
            const isDeleting = state.deleting === note.id;
            const isConfirming = state.confirmDelete === note.id;

            return (
              <div key={note.id} className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">
                      {note.author_name ?? "Törölt felhasználó"}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {formatDateTime(note.created_at)}
                    </p>
                  </div>
                  {isOwn && !isReadOnly && (
                    <div className="flex items-center gap-1">
                      {isConfirming ? (
                        <>
                          <Button
                            variant="destructive"
                            size="xs"
                            disabled={isDeleting}
                            onClick={() => handleDelete(note.id)}
                          >
                            {isDeleting ? "..." : "Igen"}
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={isDeleting}
                            onClick={() =>
                              dispatch({
                                type: "SET_CONFIRM_DELETE",
                                noteId: null,
                              })
                            }
                          >
                            Mégsem
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            dispatch({
                              type: "SET_CONFIRM_DELETE",
                              noteId: note.id,
                            })
                          }
                          title="Törlés"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
