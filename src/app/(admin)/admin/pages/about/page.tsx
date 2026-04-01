"use client";

import { useEffect, useReducer, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SingleImageUpload } from "@/components/admin/image-upload";
import {
  adminGetPageContent,
  adminUpdatePageContent,
  adminTogglePagePublished,
} from "@/lib/actions/pages";
import type { AboutUsContent, AboutUsTeamMember, AboutUsValue } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  State management (useReducer to avoid setState-in-effect lint)     */
/* ------------------------------------------------------------------ */

const EMPTY_CONTENT: AboutUsContent = {
  hero: { title: "", subtitle: "", imageUrl: null },
  story: { title: "", body: "" },
  team: [],
  values: [],
  contact: { address: "", phone: "", email: "", mapEmbedUrl: null },
};

const EMPTY_TEAM_MEMBER: AboutUsTeamMember = {
  name: "",
  role: "",
  imageUrl: null,
  bio: "",
};

const EMPTY_VALUE: AboutUsValue = {
  title: "",
  description: "",
  icon: "",
};

interface EditorState {
  content: AboutUsContent;
  isPublished: boolean;
  loading: boolean;
  saving: boolean;
  toggling: boolean;
  error: string | null;
  dirty: boolean;
  expandedSections: Record<string, boolean>;
}

type EditorAction =
  | { type: "LOADED"; content: AboutUsContent; isPublished: boolean }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SET_SAVING"; saving: boolean }
  | { type: "SET_TOGGLING"; toggling: boolean }
  | { type: "SAVED" }
  | { type: "PUBLISHED"; isPublished: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "UPDATE_HERO"; field: keyof AboutUsContent["hero"]; value: string | null }
  | { type: "UPDATE_STORY"; field: keyof AboutUsContent["story"]; value: string }
  | { type: "UPDATE_CONTACT"; field: keyof AboutUsContent["contact"]; value: string | null }
  | { type: "ADD_TEAM_MEMBER" }
  | { type: "REMOVE_TEAM_MEMBER"; index: number }
  | {
      type: "UPDATE_TEAM_MEMBER";
      index: number;
      field: keyof AboutUsTeamMember;
      value: string | null;
    }
  | { type: "ADD_VALUE" }
  | { type: "REMOVE_VALUE"; index: number }
  | { type: "UPDATE_VALUE"; index: number; field: keyof AboutUsValue; value: string }
  | { type: "TOGGLE_SECTION"; section: string };

const initialState: EditorState = {
  content: EMPTY_CONTENT,
  isPublished: false,
  loading: true,
  saving: false,
  toggling: false,
  error: null,
  dirty: false,
  expandedSections: {
    hero: true,
    story: true,
    team: true,
    values: true,
    contact: true,
  },
};

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOADED":
      return {
        ...state,
        content: action.content,
        isPublished: action.isPublished,
        loading: false,
        error: null,
        dirty: false,
      };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SET_SAVING":
      return { ...state, saving: action.saving };
    case "SET_TOGGLING":
      return { ...state, toggling: action.toggling };
    case "SAVED":
      return { ...state, saving: false, dirty: false };
    case "PUBLISHED":
      return { ...state, toggling: false, isPublished: action.isPublished };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "UPDATE_HERO":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          hero: { ...state.content.hero, [action.field]: action.value },
        },
      };
    case "UPDATE_STORY":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          story: { ...state.content.story, [action.field]: action.value },
        },
      };
    case "UPDATE_CONTACT":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          contact: { ...state.content.contact, [action.field]: action.value },
        },
      };
    case "ADD_TEAM_MEMBER":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          team: [...state.content.team, { ...EMPTY_TEAM_MEMBER }],
        },
      };
    case "REMOVE_TEAM_MEMBER":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          team: state.content.team.filter((_, i) => i !== action.index),
        },
      };
    case "UPDATE_TEAM_MEMBER": {
      const updatedTeam = [...state.content.team];
      updatedTeam[action.index] = {
        ...updatedTeam[action.index],
        [action.field]: action.value,
      };
      return {
        ...state,
        dirty: true,
        content: { ...state.content, team: updatedTeam },
      };
    }
    case "ADD_VALUE":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          values: [...state.content.values, { ...EMPTY_VALUE }],
        },
      };
    case "REMOVE_VALUE":
      return {
        ...state,
        dirty: true,
        content: {
          ...state.content,
          values: state.content.values.filter((_, i) => i !== action.index),
        },
      };
    case "UPDATE_VALUE": {
      const updatedValues = [...state.content.values];
      updatedValues[action.index] = {
        ...updatedValues[action.index],
        [action.field]: action.value,
      };
      return {
        ...state,
        dirty: true,
        content: { ...state.content, values: updatedValues },
      };
    }
    case "TOGGLE_SECTION":
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.section]: !state.expandedSections[action.section],
        },
      };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminAboutPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /* ── Load content on mount ───────────────────────── */
  useEffect(() => {
    async function load() {
      const result = await adminGetPageContent("about");
      if (result.success && result.data) {
        dispatch({
          type: "LOADED",
          content: result.data.content,
          isPublished: result.data.isPublished,
        });
      } else {
        dispatch({ type: "LOAD_ERROR", error: result.error ?? "Hiba történt a betöltés során." });
      }
    }
    load();
  }, []);

  /* ── Save handler ────────────────────────────────── */
  const handleSave = useCallback(async () => {
    dispatch({ type: "SET_SAVING", saving: true });
    dispatch({ type: "SET_ERROR", error: null });

    const result = await adminUpdatePageContent("about", state.content, state.isPublished);

    if (result.success) {
      dispatch({ type: "SAVED" });
      toast.success("Az oldal sikeresen mentve.");
    } else {
      dispatch({ type: "SET_SAVING", saving: false });
      dispatch({ type: "SET_ERROR", error: result.error ?? "Hiba történt a mentés során." });
      toast.error(result.error ?? "Hiba történt a mentés során.");
    }
  }, [state.content, state.isPublished]);

  /* ── Toggle published ────────────────────────────── */
  const handleTogglePublished = useCallback(async () => {
    // Save first if dirty
    if (state.dirty) {
      dispatch({ type: "SET_SAVING", saving: true });
      const saveResult = await adminUpdatePageContent("about", state.content, state.isPublished);
      if (!saveResult.success) {
        dispatch({ type: "SET_SAVING", saving: false });
        toast.error("Mentés szükséges a közzététel előtt, de hiba történt.");
        return;
      }
      dispatch({ type: "SAVED" });
    }

    dispatch({ type: "SET_TOGGLING", toggling: true });
    const result = await adminTogglePagePublished("about");

    if (result.success && result.data) {
      dispatch({ type: "PUBLISHED", isPublished: result.data.isPublished });
      toast.success(
        result.data.isPublished ? "Az oldal közzétéve." : "Az oldal rejtett állapotba állítva.",
      );
    } else {
      dispatch({ type: "SET_TOGGLING", toggling: false });
      toast.error(result.error ?? "Hiba történt.");
    }
  }, [state.dirty, state.content, state.isPublished]);

  /* ── Loading state ───────────────────────────────── */
  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Rólunk oldal</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Szerkeszd az oldal tartalmát, majd tedd közzé.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={state.isPublished ? "default" : "secondary"}>
            {state.isPublished ? "Közzétéve" : "Piszkozat"}
          </Badge>

          <Link
            href="/about"
            target="_blank"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Előnézet
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePublished}
            disabled={state.toggling || state.saving}
          >
            {state.toggling ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : state.isPublished ? (
              <EyeOff className="mr-2 size-3.5" />
            ) : (
              <Eye className="mr-2 size-3.5" />
            )}
            {state.isPublished ? "Elrejtés" : "Közzététel"}
          </Button>

          <Button size="sm" onClick={handleSave} disabled={state.saving || !state.dirty}>
            {state.saving ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-2 size-3.5" />
            )}
            Mentés
          </Button>
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────── */}
      {state.error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {state.error}
        </div>
      )}

      {/* ── Dirty indicator ───────────────────────────── */}
      {state.dirty && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Nem mentett módosítások vannak. Ne felejtsd el menteni!
        </div>
      )}

      {/* ── Hero Section ──────────────────────────────── */}
      <CollapsibleSection
        title="Hero szekció"
        description="Főcím, alcím és opcionális kép"
        section="hero"
        expanded={state.expandedSections.hero}
        onToggle={() => dispatch({ type: "TOGGLE_SECTION", section: "hero" })}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Cím</Label>
            <Input
              id="hero-title"
              value={state.content.hero.title}
              onChange={(e) =>
                dispatch({ type: "UPDATE_HERO", field: "title", value: e.target.value })
              }
              placeholder="pl. A mi történetünk"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Alcím</Label>
            <Textarea
              id="hero-subtitle"
              value={state.content.hero.subtitle}
              onChange={(e) =>
                dispatch({ type: "UPDATE_HERO", field: "subtitle", value: e.target.value })
              }
              placeholder="pl. Minőségi termékek, megbízható szolgáltatás..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Kép</Label>
            <SingleImageUpload
              value={state.content.hero.imageUrl ?? ""}
              onChange={(url) => dispatch({ type: "UPDATE_HERO", field: "imageUrl", value: url })}
              onRemove={() => dispatch({ type: "UPDATE_HERO", field: "imageUrl", value: null })}
            />
            <p className="text-muted-foreground text-xs">
              Ajánlott méret: 1200×900 px. Hagyd üresen, ha nem szeretnél képet.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Story Section ─────────────────────────────── */}
      <CollapsibleSection
        title="Történetünk"
        description="Cím és hosszabb szöveges tartalom"
        section="story"
        expanded={state.expandedSections.story}
        onToggle={() => dispatch({ type: "TOGGLE_SECTION", section: "story" })}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="story-title">Cím</Label>
            <Input
              id="story-title"
              value={state.content.story.title}
              onChange={(e) =>
                dispatch({ type: "UPDATE_STORY", field: "title", value: e.target.value })
              }
              placeholder="pl. Hogyan kezdődött?"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story-body">Szöveg</Label>
            <Textarea
              id="story-body"
              value={state.content.story.body}
              onChange={(e) =>
                dispatch({ type: "UPDATE_STORY", field: "body", value: e.target.value })
              }
              placeholder="Mesélj a cég történetéről, küldetéséről..."
              maxLength={10000}
              rows={10}
            />
            <p className="text-muted-foreground text-xs">
              {state.content.story.body.length.toLocaleString("hu-HU")} / 10 000 karakter
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Team Section ──────────────────────────────── */}
      <CollapsibleSection
        title="Csapat"
        description={`${state.content.team.length} csapattag`}
        section="team"
        expanded={state.expandedSections.team}
        onToggle={() => dispatch({ type: "TOGGLE_SECTION", section: "team" })}
      >
        <div className="space-y-6">
          {state.content.team.map((member, index) => (
            <div key={index} className="bg-muted/30 relative rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">
                  Csapattag #{index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => dispatch({ type: "REMOVE_TEAM_MEMBER", index })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Név</Label>
                  <Input
                    value={member.name}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_TEAM_MEMBER",
                        index,
                        field: "name",
                        value: e.target.value,
                      })
                    }
                    placeholder="pl. Kovács Anna"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pozíció</Label>
                  <Input
                    value={member.role}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_TEAM_MEMBER",
                        index,
                        field: "role",
                        value: e.target.value,
                      })
                    }
                    placeholder="pl. Ügyvezető"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Kép</Label>
                  <SingleImageUpload
                    value={member.imageUrl ?? ""}
                    onChange={(url) =>
                      dispatch({
                        type: "UPDATE_TEAM_MEMBER",
                        index,
                        field: "imageUrl",
                        value: url,
                      })
                    }
                    onRemove={() =>
                      dispatch({
                        type: "UPDATE_TEAM_MEMBER",
                        index,
                        field: "imageUrl",
                        value: null,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Bemutatkozás</Label>
                  <Textarea
                    value={member.bio}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_TEAM_MEMBER",
                        index,
                        field: "bio",
                        value: e.target.value,
                      })
                    }
                    placeholder="Rövid bemutatkozás..."
                    maxLength={1000}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}

          {state.content.team.length < 20 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "ADD_TEAM_MEMBER" })}
            >
              <Plus className="mr-2 size-3.5" />
              Csapattag hozzáadása
            </Button>
          )}

          {state.content.team.length >= 20 && (
            <p className="text-muted-foreground text-xs">Maximum 20 csapattag adható meg.</p>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Values Section ────────────────────────────── */}
      <CollapsibleSection
        title="Értékeink"
        description={`${state.content.values.length} érték`}
        section="values"
        expanded={state.expandedSections.values}
        onToggle={() => dispatch({ type: "TOGGLE_SECTION", section: "values" })}
      >
        <div className="space-y-6">
          {state.content.values.map((value, index) => (
            <div key={index} className="bg-muted/30 relative rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">
                  Érték #{index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => dispatch({ type: "REMOVE_VALUE", index })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cím</Label>
                  <Input
                    value={value.title}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_VALUE",
                        index,
                        field: "title",
                        value: e.target.value,
                      })
                    }
                    placeholder="pl. Megbízhatóság"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ikon neve</Label>
                  <Input
                    value={value.icon}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_VALUE",
                        index,
                        field: "icon",
                        value: e.target.value,
                      })
                    }
                    placeholder="pl. shield-check"
                    maxLength={50}
                  />
                  <p className="text-muted-foreground text-xs">Lucide ikon neve (opcionális).</p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Leírás</Label>
                  <Textarea
                    value={value.description}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_VALUE",
                        index,
                        field: "description",
                        value: e.target.value,
                      })
                    }
                    placeholder="Rövid leírás az értékről..."
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}

          {state.content.values.length < 12 && (
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "ADD_VALUE" })}>
              <Plus className="mr-2 size-3.5" />
              Érték hozzáadása
            </Button>
          )}

          {state.content.values.length >= 12 && (
            <p className="text-muted-foreground text-xs">Maximum 12 érték adható meg.</p>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Contact Section ───────────────────────────── */}
      <CollapsibleSection
        title="Kapcsolat"
        description="Cím, telefon, email, térkép"
        section="contact"
        expanded={state.expandedSections.contact}
        onToggle={() => dispatch({ type: "TOGGLE_SECTION", section: "contact" })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-address">Cím</Label>
            <Input
              id="contact-address"
              value={state.content.contact.address}
              onChange={(e) =>
                dispatch({ type: "UPDATE_CONTACT", field: "address", value: e.target.value })
              }
              placeholder="pl. 1052 Budapest, Váci utca 1."
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Telefonszám</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={state.content.contact.phone}
              onChange={(e) =>
                dispatch({ type: "UPDATE_CONTACT", field: "phone", value: e.target.value })
              }
              placeholder="pl. +36 30 123 4567"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={state.content.contact.email}
              onChange={(e) =>
                dispatch({ type: "UPDATE_CONTACT", field: "email", value: e.target.value })
              }
              placeholder="pl. info@bolt.hu"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-map">Térkép beágyazási URL</Label>
            <Input
              id="contact-map"
              type="url"
              value={state.content.contact.mapEmbedUrl ?? ""}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_CONTACT",
                  field: "mapEmbedUrl",
                  value: e.target.value || null,
                })
              }
              placeholder="https://www.google.com/maps/embed?..."
            />
            <p className="text-muted-foreground text-xs">
              Google Maps beágyazási link. Hagyd üresen, ha nem szeretnél térképet.
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section wrapper                                        */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  description,
  section: _section,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  section: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="text-muted-foreground size-4" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4" />
            )}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <>
          <Separator />
          <CardContent className="pt-6">{children}</CardContent>
        </>
      )}
    </Card>
  );
}
