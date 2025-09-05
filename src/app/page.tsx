"use client";

export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";

import { QuickActions } from "@/components/QuickActions";
import { ShootList } from "@/components/ShootList";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Music2, CalendarDays, Archive, Sun, Moon, MapPin, Upload, X, Trash2, Copy, Printer, Lightbulb, ListFilter, Smartphone } from "lucide-react";
import { fetchShootsForUser, createShootFromTemplate, updateShoot, deleteShoot, fetchScenes, upsertScene, getMyProfile } from "@/lib/db";


const STATUSES = ["Not Started", "In Progress", "Shot", "In Edit", "Approved"];
const PRIORITIES = ["Low", "Medium", "High"];
const TIME_OF_DAY = ["Day", "Golden Hour", "Night", "Blue Hour"];
const LS_KEY = "gawne_store_v36";
const THEME_KEY = "gawne_theme";
const BK_KEY = "gawne_backups";
const uid = () => Math.random().toString(36).slice(2, 10);
const seedSongs = () => ["Chopper", "This Is War"];
const seedTemplates = () => [
  {
    id: uid(),
    name: "Performance – Quick Rinse",
    overview: { duration: 60, timeOfDay: "Golden Hour", locations: ["Studio"], notes: "Run hooks" },
    fields: [
      { id: uid(), key: "title", label: "Title", kind: "text" },
      { id: uid(), key: "description", label: "Description", kind: "textarea" },
      { id: uid(), key: "songs", label: "Songs", kind: "songs" },
      { id: uid(), key: "timecodes", label: "Timecodes", kind: "text" },
      { id: uid(), key: "status", label: "Status", kind: "status" },
      { id: uid(), key: "priority", label: "Priority", kind: "priority" },
      { id: uid(), key: "checklist", label: "Checklist", kind: "checklist" }
    ]
  },
  {
    id: uid(),
    name: "Skits – Dialogue",
    overview: { duration: 120, timeOfDay: "Day", locations: ["Kitchen", "Street"], notes: "Short beats" },
    fields: [
      { id: uid(), key: "title", label: "Beat", kind: "text" },
      { id: uid(), key: "description", label: "Scene", kind: "textarea" },
      { id: uid(), key: "dialogue", label: "Dialogue", kind: "textarea" },
      { id: uid(), key: "songs", label: "Ref Song(s)", kind: "songs" },
      { id: uid(), key: "status", label: "Status", kind: "status" },
      { id: uid(), key: "priority", label: "Priority", kind: "priority" }
    ]
  }
];
const loadStore = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw)
      return {
        songs: seedSongs(),
        templates: seedTemplates(),
        shoots: [],
        settings: { showVaultOnDashboard: true, confirmDeletions: true, defaultDuration: 60, defaultTimeOfDay: "Day" }
      };
    const s = JSON.parse(raw);
    s.songs ||= seedSongs();
    s.templates ||= seedTemplates();
    s.shoots ||= [];
    s.settings ||= { showVaultOnDashboard: true, confirmDeletions: true, defaultDuration: 60, defaultTimeOfDay: "Day" };
    return s;
  } catch {
    return { songs: seedSongs(), templates: seedTemplates(), shoots: [], settings: { showVaultOnDashboard: true, confirmDeletions: true, defaultDuration: 60, defaultTimeOfDay: "Day" } };
  }
};
const saveStore = (s: any) => { if (typeof window !== 'undefined') { localStorage.setItem(LS_KEY, JSON.stringify(s)); } };
const backupStore = (s: any) => { if (typeof window === 'undefined') return; try { const arr = JSON.parse(localStorage.getItem(BK_KEY) || "[]"); arr.unshift({ t: Date.now(), data: s }); localStorage.setItem(BK_KEY, JSON.stringify(arr.slice(0, 10))); } catch {} };

const toLocArray = (locs: unknown) =>
  Array.isArray(locs)
    ? locs
    : (locs ? String(locs).split(",").map(s => s.trim()).filter(Boolean) : []);

const normalizeShoot = (s: any) => ({
  ...s,
  files: s?.files ?? { raw: [], edits: [], approved: [] },
});   


function InfoTip({ text }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-accent/40 cursor-help">
            <Lightbulb className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Templates({ store, onStore }) {
  const [name, setName] = useState("");
  const [locations, setLocations] = useState("");
  const [duration, setDuration] = useState(60);
  const [timeOfDay, setTimeOfDay] = useState("Day");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(null);
  const create = () => {
    if (!name.trim()) return;
    const tpl = {
      id: uid(),
      name: name.trim(),
      overview: { duration, timeOfDay, notes, locations: locations ? locations.split(",").map(v => v.trim()) : [] },
      fields: []
    };
    onStore({ templates: [tpl, ...store.templates] });
    setName("");
    setLocations("");
    setDuration(60);
    setTimeOfDay("Day");
    setNotes("");
  };
  const update = (id, patch) => onStore({ templates: store.templates.map(t => (t.id === id ? { ...t, ...patch } : t)) });
  const addField = t => update(t.id, { fields: [...t.fields, { id: uid(), key: `field_${Date.now()}`, label: "New Field", kind: "text" }] });
  const removeField = (t, fid) => update(t.id, { fields: t.fields.filter(f => f.id !== fid) });
  const moveField = (t, fid, dir) => {
    const i = t.fields.findIndex(f => f.id === fid);
    if (i < 0) return;
    const a = [...t.fields];
    const ni = Math.max(0, Math.min(a.length - 1, i + dir));
    const [sp] = a.splice(i, 1);
    a.splice(ni, 0, sp);
    update(t.id, { fields: a });
  };
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="rounded-2xl shadow-sm"><CardHeader className="flex items-center justify-between">
          <CardTitle>Create Template</CardTitle>
          <InfoTip text="Templates define scene fields" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label="Name">
            <Input value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Locations (comma)">
            <Input value={locations} onChange={e => setLocations(e.target.value)} />
          </Field>
          <Field label="Duration (min)">
            <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value || 0))} />
          </Field>
          <Field label="Time of Day">
            <Select
              value={t.overview?.timeOfDay ?? undefined}
              onValueChange={(v) =>
                update(t.id, { overview: { ...t.overview, timeOfDay: v } })
              }
                    >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {/* IMPORTANT: no empty string items; filter out falsy just in case */}
              {TIME_OF_DAY.filter(Boolean).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button className="cursor-pointer" onClick={create}>
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-sm"><CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
          {store.templates.map(t => (
            <div key={t.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.name}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => setEditing(t.id)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onStore({ templates: store.templates.filter(x => x.id !== t.id) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Fields: {t.fields.length} • Locations: {t.overview?.locations?.join(" • ") || "—"}</div>
            </div>
          ))}
          {store.templates.length === 0 && <div className="text-sm text-muted-foreground">No templates yet.</div>}
        </CardContent>
      </Card>
      {editing && (
        <Dialog open onOpenChange={v => !v && setEditing(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            {store.templates
              .filter(t => t.id === editing)
              .map(t => (
                <div key={t.id} className="space-y-4">
                  <Field label="Name">
                    <Input value={t.name} onChange={e => update(t.id, { name: e.target.value })} />
                  </Field>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Locations">
                      <Input
                        value={(t.overview?.locations || []).join(", ")}
                        onChange={e => update(t.id, { overview: { ...t.overview, locations: e.target.value ? e.target.value.split(",").map(v => v.trim()) : [] } })}
                      />
                    </Field>
                    <Field label="Duration">
                      <Input type="number" value={t.overview?.duration || 0} onChange={e => update(t.id, { overview: { ...t.overview, duration: Number(e.target.value || 0) } })} />
                    </Field>
                    <Field label="Time of Day">
                      <Select value={t.overview?.timeOfDay || "Day"} onValueChange={v => update(t.id, { overview: { ...t.overview, timeOfDay: v } })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OF_DAY.map(v => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Notes">
                        <Textarea
                        value={t.overview?.notes ?? ""}
                        onChange={e =>
                          update(t.id, { overview: { ...t.overview, notes: e.target.value } })
                        }
                      />
                      </Field>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Fields</div>
                    <Button size="sm" onClick={() => addField(t)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {t.fields.map(f => (
                      <div key={f.id} className="border rounded-lg p-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">↕</span>
                        <Input className="max-w-[12rem]" value={f.label} onChange={e => update(t.id, { fields: t.fields.map(x => (x.id === f.id ? { ...x, label: e.target.value } : x)) })} />
                        <Select value={f.kind} onValueChange={v => update(t.id, { fields: t.fields.map(x => (x.id === f.id ? { ...x, kind: v } : x)) })}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="songs">Songs (multi)</SelectItem>
                            <SelectItem value="timecodes">Timecodes</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="checklist">Checklist</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="outline" onClick={() => moveField(t, f.id, -1)}>↑</Button>
                        <Button size="icon" variant="outline" onClick={() => moveField(t, f.id, 1)}>↓</Button>
                        <Button size="icon" variant="ghost" onClick={() => removeField(t, f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {t.fields.length === 0 && <div className="text-sm text-muted-foreground">No fields yet. Add one.</div>}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setEditing(null)}>Done</Button>
                  </div>
                </div>
              ))}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Settings({ store, onStore }) {
  const [page, setPage] = React.useState<"general" | "songs" | "backups">("general");

  // Songs editor
  const [songsText, setSongsText] = React.useState(store.songs.join("\n"));
  const saveSongs = () => {
    const songs = songsText.split("\n").map(s => s.trim()).filter(Boolean);
    onStore({ ...store, songs });
  };
  const resetSongs = () => {
    const songs = seedSongs();
    setSongsText(songs.join("\n"));
    onStore({ ...store, songs });
  };

  // Export / Import
  const [exportOpen, setExportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const doExport = () => setExportOpen(true);
  const doImport = () => {
    try {
      const obj = JSON.parse(importText);
      onStore(obj);
      alert("Imported. Reload recommended.");
    } catch {
      alert("Invalid JSON");
    }
  };

  // Local backups (latest 10)
  const backups =
    typeof window !== "undefined" ? JSON.parse(localStorage.getItem(BK_KEY) || "[]") : [];

  return (
    <div className="grid md:grid-cols-5 gap-4">
      {/* Left nav */}
      <div className="md:col-span-1">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={page === "general" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setPage("general")}
            >
              General
            </Button>
            <Button
              variant={page === "songs" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setPage("songs")}
            >
              Songs
            </Button>
            <Button
              variant={page === "backups" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setPage("backups")}
            >
              Backups
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right panel */}
      <div className="md:col-span-4 space-y-4">
        {page === "general" && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>About & Data</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <div className="grid md:grid-cols-2 gap-3 items-end">
                <div>
                  <Label className="text-xs">Display name</Label>
                  <Input
                    className="mt-1"
                    placeholder="Your name"
                    value={store.settings?.displayName || ""}
                    onChange={e =>
                      onStore({
                        settings: { ...store.settings, displayName: e.target.value },
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Shown in the greeting on this device only.
                  </p>
                </div>
              </div>

              <p>
                Local prototype with offline autosave. Vault shows unscheduled shoots.
                Dark/Light mode persists.
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={doExport}>Export JSON</Button>
                <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Export / Import</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Label>Copy your data</Label>
                      <Textarea readOnly value={JSON.stringify(store, null, 2)} className="h-48" />
                      <Label className="mt-2">Paste JSON to import</Label>
                      <Textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        className="h-40"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setExportOpen(false)}>
                          Close
                        </Button>
                        <Button onClick={doImport}>Import</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {page === "songs" && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Songs</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-sm">Songs (one per line)</Label>
              <Textarea
                className="mt-2 h-60"
                value={songsText}
                onChange={e => setSongsText(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <Button onClick={saveSongs}>Save Songs</Button>
                <Button variant="outline" onClick={resetSongs}>
                  Reset to Defaults
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Populates the scene multi-select.
              </p>
            </CardContent>
          </Card>
        )}

        {page === "backups" && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Backups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Local automatic backups keep the last 10 snapshots on this device only. Use
                this page to restore or export. For team use, we’ll later move this to cloud
                storage (Supabase) so it syncs across devices.
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={doExport}>Export / Import JSON</Button>
                <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Export / Import</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Label>Copy your data</Label>
                      <Textarea readOnly value={JSON.stringify(store, null, 2)} className="h-48" />
                      <Label className="mt-2">Paste JSON to import</Label>
                      <Textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        className="h-40"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setExportOpen(false)}>
                          Close
                        </Button>
                        <Button onClick={doImport}>Import</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <Label className="text-xs">Backups (latest 10 on this device)</Label>
                <div className="text-xs mt-1 space-y-1">
                  {backups.map(b => (
                    <div
                      key={b.t}
                      className="flex items-center justify-between border rounded px-2 py-1"
                    >
                      <span>{new Date(b.t).toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onStore(b.data);
                          alert("Restored backup.");
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <div className="text-xs">No backups yet.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Help</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>Use <b>New Shoot</b> or pick a Template to start.</p>
          <p>Admins can assign/unassign a videographer in the Planner.</p>
          <p>If anything looks off after switching accounts, refresh the page.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [store, setStore] = useState(() => (typeof window !== 'undefined' ? loadStore() : { songs: seedSongs(), templates: seedTemplates(), shoots: [], settings: { showVaultOnDashboard: true, confirmDeletions: true, defaultDuration: 60, defaultTimeOfDay: "Day" } }));
  const [tab, setTab] = useState("dashboard");
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' ? (localStorage.getItem(THEME_KEY) || "dark") : "dark"));
  const [filterNext7, setFilterNext7] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [qArchive, setQArchive] = useState("");

const [session, setSession] = useState<any | null | undefined>(undefined);

const [role, setRole] = useState<'admin'|'videographer'>('videographer');
// List of videographers for the dropdown (admins only)
const [videographers, setVideographers] = useState<{user_id: string; display_name: string | null}[]>([]);
const [shoots, setShoots] = useState<any[]>([]);
  
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
  const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
  return () => sub.subscription.unsubscribe();
}, []);

// Also clear shoots on sign in/out (auth state changes)
useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange(() => {
    setShoots([]);
    updateStore({ shoots: [] });
    try { localStorage.removeItem(LS_KEY); } catch {}
  });
  return () => sub?.subscription?.unsubscribe?.();
}, []);

useEffect(() => {
  if (session === null) window.location.replace("/signin");
}, [session]);

const user = session?.user; // { id, email, ... }
// Clear shoots when the logged-in user changes
const userId = session?.user?.id ?? null;

useEffect(() => {
  // wipe in-memory list
  setShoots([]);
  // wipe your persisted store
  updateStore({ shoots: [] });
  // optional: also clear the saved store so the UI cannot reuse old rows
  try { localStorage.removeItem(LS_KEY); } catch {}
}, [userId]);

useEffect(() => {
  async function load() {
    const profile = await getMyProfile();
    setRole(profile.role);
    const data = await fetchShootsForUser();
    const normalized = data.map(normalizeShoot);
    setShoots(normalized);
    updateStore({ shoots: normalized });
  }
  if (session) load().catch(console.error);
}, [session]);

// When the logged-in user is an admin, load all videographers for the picker
useEffect(() => {
  if (role !== 'admin') return;
  (async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('role', 'videographer')
      .order('display_name', { ascending: true });

    if (!error && data) setVideographers(data);
  })();
}, [role]);


  useEffect(() => {
    if (store) {
      saveStore(store);
      backupStore(store);
    }
  }, [store]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  if (!store) return <div className="p-6">Loading…</div>;

    // Make server and first client render identical; switch to live UI after hydration
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);


async function removeShoot(shoot: Shoot) {
  // --- optimistic update (simple + snappy) ---
  const prev = store.shoots;
  updateStore({ shoots: prev.filter(x => x.id !== shoot.id) });
  try {
    await deleteShoot(shoot.id, user?.id); // Supabase delete
  } catch (err) {
    // rollback on error
    updateStore({ shoots: prev });
    console.error(err);
    alert("Couldn’t delete shoot. Please try again.");
  }
}

  const updateStore = patch => setStore(p => ({ ...p, ...patch }));

  const matchQ = (s, query) => {
    const ql = query.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(ql) ||
      (s.locations || []).join(", ").toLowerCase().includes(ql) ||
      (s.notes || "").toLowerCase().includes(ql)
    );
  };
  const plannedAll = useMemo(() => store.shoots.filter(s => !s.archived), [store.shoots]);
  const plannedFiltered = useMemo(() => {
    let a = [...plannedAll];
    if (q) a = a.filter(s => matchQ(s, q));
    if (statusFilter !== "All") a = a.filter(s => (s.status || "Plan") === statusFilter);
    return a;
  }, [plannedAll, q, statusFilter]);
  const planned = useMemo(() => {
    if (!filterNext7) return plannedFiltered;
    const n = new Date();
    const i7 = new Date();
    i7.setDate(n.getDate() + 7);
    return plannedFiltered.filter(s => s.date && new Date(s.date) >= n && new Date(s.date) <= i7);
  }, [plannedFiltered, filterNext7]);
  const vaultList = useMemo(() => {
    let a = store.shoots.filter(s => !s.date && !s.archived);
    if (q) a = a.filter(s => matchQ(s, q));
    if (statusFilter !== "All") a = a.filter(s => (s.status || "Plan") === statusFilter);
    return a;
  }, [store.shoots, q, statusFilter]);
  const archived = useMemo(() => store.shoots.filter(s => s.archived).filter(s => matchQ(s, qArchive)), [store.shoots, qArchive]);

  async function addShoot(tpl?: any) {
  // if not admin, auto-assign to the current user
  const assigned_user = role === "admin" ? null : (session?.user?.id ?? null);

  const payload = {
  name: tpl ? `${tpl.name} Draft` : "Untitled Shoot",
  date: null,                 // add
  duration: tpl?.overview?.duration ?? 60,   // use 60 as default
  timeOfDay: tpl?.overview?.timeOfDay ?? "Day",
  locations: tpl?.overview?.locations?.join(", ") ?? "",
  weather: "",                // add
  notes: tpl?.overview?.notes ?? "",
  status: "Not Started",
  archived: false,
  files: {},                  // add
  assigned_user,              // you already set this above
};

  const { data, error } = await supabase
    .from("shoots")
    .insert(payload)
    .select(
      "id, name, date, duration, locations, weather, notes, status, archived, timeOfDay, files, assigned_user"
    )
    .single();

  if (error) {
    console.error("Create shoot failed:", error);
    alert("Could not create shoot: " + error.message);
    return;
  }

  const createdNorm = normalizeShoot(data);
  setShoots((s) => [createdNorm, ...s]);
  updateStore({ shoots: [createdNorm, ...store.shoots] });
  window.location.hash = `#planner:${createdNorm.id}`;
}




//ERROR ORIGINATES HERE
// async function addShoot(tpl?: any) {
//   const created = await createShootFromTemplate({
//     name: tpl ? `${tpl.name} – Draft` : "Untitled Shoot",
//     duration: tpl?.overview?.duration,
//     timeOfDay: tpl?.overview?.timeOfDay,
//     locations: tpl?.overview?.locations?.join(", ") || "",
//     notes: tpl?.overview?.notes || ""
//   });
//   setShoots(s => [created, ...s]);
//   window.location.hash = `#planner:${created.id}`;
// }

  // const patchShoot = (id, patch) => updateStore({ shoots: store.shoots.map(s => (s.id === id ? { ...s, ...patch } : s)) });

async function patchShoot(id: string, patch: any) {
  await updateShoot(id, patch);
  setShoots(s => s.map(x => (x.id === id ? { ...x, ...patch } : x)));
  updateStore({
    shoots: store.shoots.map(x => (x.id === id ? { ...x, ...patch } : x)), // ✅ keep UI in sync
  });
}

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music2 className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">GAWNE - Shoot Planner</h1>
            <Badge variant="secondary">v3.6.1</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="ml-2 hidden md:inline">{theme === "dark" ? "Light" : "Dark"} Mode</span>
            </Button>
            <QuickActions onBlank={() => addShoot()} onFromTemplate={t => addShoot(t)} templates={store.templates} />
          <Button variant="ghost" onClick={() => supabase.auth.signOut().then(()=> (window.location.href="/signin"))}>
            Sign out
            </Button>
          </div>
        </header>

        <div className="flex items-center justify-between pt-1 pb-2">
          <div className="text-sm md:text-base font-medium">Hi, {store?.settings?.displayName || "Guest"}! <span className="ml-1">👋</span></div>
          <div className="text-sm text-muted-foreground" suppressHydrationWarning>{new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Input placeholder="Search shoots, locations, notes…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 md:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Plan">Plan</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card className="rounded-2xl shadow-sm"><CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  All Planned Shoots
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Next 7 days only</Label>
                  <Checkbox checked={filterNext7} onCheckedChange={v => setFilterNext7(!!v)} />
                </div>
              </CardHeader>
              <CardContent>
                {hydrated ? (
                <ShootList
                  items={planned}
                  onOpen={s => openPlanner(s.id)}
                  onArchive={s => patchShoot(s.id, { archived: true })}
                  onStatus={(s, st) => patchShoot(s.id, { status: st })}
                  onDelete={removeShoot}
                  confirmDeletions={store.settings?.confirmDeletions !== false}
                />
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border text-sm text-muted-foreground">
                    Loading shoots…
                  </div>
                </div>
              )}

              </CardContent>
            </Card>
            {store.settings?.showVaultOnDashboard !== false && (
              <Card className="rounded-2xl shadow-sm"><CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Vault (unscheduled)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                {hydrated ? (
                <ShootList
                  items={vaultList}
                  onOpen={s => openPlanner(s.id)}
                  onArchive={s => patchShoot(s.id, { archived: true })}
                  onStatus={(s, st) => patchShoot(s.id, { status: st })}
                  onDelete={removeShoot}
                  confirmDeletions={store.settings?.confirmDeletions !== false}
                />
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border text-sm text-muted-foreground">
                    Loading shoots…
                  </div>
                </div>
              )}

                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="archive">
            <Card className="rounded-2xl shadow-sm"><CardHeader className="flex items-center justify-between">
                <CardTitle>Archive</CardTitle>
                <Input placeholder="Search name/location/notes" value={qArchive} onChange={e => setQArchive(e.target.value)} className="max-w-xs" />
              </CardHeader>
              <CardContent>
               {hydrated ? (
              <ShootList
                items={archived}
                onOpen={s => openPlanner(s.id)}
                onArchive={s => patchShoot(s.id, { archived: true })}
                onStatus={(s, st) => patchShoot(s.id, { status: st })}
                onDelete={removeShoot}
                confirmDeletions={store.settings?.confirmDeletions !== false}
              />
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border text-sm text-muted-foreground">
                  Loading archive…
                </div>
              </div>
            )}

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Templates store={store} onStore={updateStore} />
          </TabsContent>
          <TabsContent value="settings">
            <Settings store={store} onStore={updateStore} />
          </TabsContent>
          <TabsContent value="help">
            <HelpPage />
          </TabsContent>
        </Tabs>
      </div>
       <PlannerPortal
          store={store}
          onStore={updateStore}
          role={role}
          videographers={videographers}
        />
    </div>
  );
  function openPlanner(id) {
    window.location.hash = `#planner:${id}`;
  }
}

async function createShootFromUI() {
  const blank = {
    name: "Untitled Shoot",
    date: null,
    duration: 60,
    locations: "",
    weather: "",
    timeOfDay: "Day",
    notes: "",
    status: "Not Started",
    archived: false,
    files: {},
  };

  const { data, error } = await supabase
    .from("shoots")
    .insert([blank])
    .select("*")
    .single();

  if (error) {
    alert("Could not create shoot: " + error.message);
    return;
  }

  // Add to the screen immediately
  setShoots((s: any[]) => [data, ...s]);

  // Open Planner for the new shoot
  location.hash = `#planner:${data.id}`;
}

function PlannerPortal({ store, onStore, role, videographers }) {
  // --- 1) State (declare FIRST) ---
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [mobileId, setMobileId] = React.useState<string | null>(null);
  const [callSheetId, setCallSheetId] = React.useState<string | null>(null);

  // Local draft for Planner (typing shouldn't mutate global store immediately)
  const [draft, setDraft] = React.useState<{ scenes: any[] }>({ scenes: [] });

  // --- 2) Which shoot is open in Planner (NOT mobile/callsheet) ---
  const plannerShoot =
  store.shoots.find((s: any) => s.id === openId) || null;
  const shoot = plannerShoot;
  // Keep draft in sync with the store shoot open in Planner
  React.useEffect(() => {
  setDraft({ scenes: shoot?.scenes || [] });
  // Only when the currently open shoot changes
}, [plannerShoot?.id, store.shoots]);

  // --- 3) Keep hash -> ids in state ---
  React.useEffect(() => {
    const sync = () => {
      const m  = location.hash.match(/#planner:(.*)$/);
      const m2 = location.hash.match(/#planner-mobile:(.*)$/);
      const m3 = location.hash.match(/#callsheet:(.*)$/);
      setOpenId(m?.[1] ?? null);
      setMobileId(m2?.[1] ?? null);
      setCallSheetId(m3?.[1] ?? null);
    };
    sync();
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, []);

  // --- 4) Early returns go AFTER state/Effects ---
  if (mobileId) {
    const shoot = store.shoots.find((s: any) => s.id === mobileId);
    if (!shoot) return null;
    return <ShootDayMobile shoot={shoot} store={store} onStore={onStore} />;
  }

  if (callSheetId) {
    const shoot = store.shoots.find((s: any) => s.id === callSheetId);
    if (!shoot) return null;
    return <CallSheetPrint shoot={shoot} store={store} onStore={onStore} />;
  }

  // If no Planner shoot is open, render nothing
if (!openId || !plannerShoot) return null;

  // From here downward you can use: plannerShoot, draft, setDraft, etc.
  // (Your helpers like setField, setSceneVal, commitScenes, patchScenes, etc.)

const setField = (key: string, val: any) =>
  setDraft((d: any) => ({ ...d, [key]: val }));

const setSceneVal = (id: string, key: string, val: any) =>
  setDraft((d: any) => ({
    ...d,
    scenes: (d.scenes || []).map((sc: any) =>
      sc.id === id ? { ...sc, values: { ...(sc.values || {}), [key]: val } } : sc
    ),
  }));

const commitScenes = () => patch({ scenes: draft.scenes || [] });

// Sort scenes by priority (High → Medium → Low), then commit to the store
const autoOrderScenes = () => {
  const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  setDraft((d) => ({
    ...d,
    scenes: [...(d.scenes || [])].sort((a: any, b: any) => {
      const ap = a.values?.priority ?? "Medium";
      const bp = b.values?.priority ?? "Medium";
      return (order[ap] ?? 1) - (order[bp] ?? 1);
    }),
  }));

  // write the sorted order back to the store
  commitScenes();
};

// Template & fields for this shoot
const tpl1 =
  store.templates.find((t: any) => t.id === shoot.schemaTemplateId) ||
  store.templates[0] ||
  { fields: [] as any[] };

const fields = tpl1.fields || [];

// Helpers to update this shoot safely (use openId, not `shoot` in the patch)
const patch = (p: any) =>
  onStore({
    shoots: store.shoots.map((s: any) => (s.id === openId ? { ...s, ...p } : s)),
  });

// sometimes we want to defer a patch to the next tick
const patchSafe = (p: any) => setTimeout(() => patch(p), 0);

// Scenes helpers
const patchScenes = (n: any[]) => patch({ scenes: n });

const addScene = () =>
  patchScenes([{ id: uid(), values: {}, title: "New Scene" }, ...(shoot.scenes || [])]);

const duplicateScene = (id: string) => {
  const sc = (shoot.scenes || []).find((x: any) => x.id === id);
  if (!sc) return;
  patchScenes([{ ...sc, id: uid() }, ...(shoot.scenes || [])]);
};

const removeScene = (id: string) =>
  patchScenes((shoot.scenes || []).filter((s: any) => s.id !== id));

const updateSceneValue = (id: string, key: string, value: any) =>
  patchScenes(
    (shoot.scenes || []).map((sc: any) =>
      sc.id === id ? { ...sc, values: { ...sc.values, [key]: value } } : sc
    )
  );


  const duplicateShoot = async () => {
  const { data: u } = await supabase.auth.getUser();
  const payload = {
    name: `${shoot.name} (Copy)`,
    date: shoot.date ?? null,
    duration: shoot.duration ?? null,
    timeOfDay: shoot.timeOfDay ?? null,
    locations: shoot.locations ?? "",
    weather: shoot.weather ?? "",
    notes: shoot.notes ?? "",
    status: shoot.status ?? "Not Started",
    archived: false,
    files: shoot.files ?? null,
    // keep same assignee; if none and user isn't admin, assign to self
    assigned_user: shoot.assigned_user ?? (role === "admin" ? null : (u?.user?.id ?? null)),
  };

  const { data, error } = await supabase
    .from("shoots")
    .insert(payload)
    .select(
      "id, name, date, duration, locations, weather, notes, status, archived, timeOfDay, files, assigned_user"
    )
    .single();

  if (error) {
    console.error("Duplicate shoot failed:", error);
    alert("Could not duplicate: " + error.message);
    return;
  }

  const copy = normalizeShoot(data);
  onStore({ shoots: [copy, ...store.shoots] });
  location.hash = `#planner:${copy.id}`;
};



  function autoOrder(type) {
    const scenes = [...(shoot.scenes || [])];
    if (type === "priority")
      scenes.sort(
        (a, b) => PRIORITIES.indexOf(b.values?.priority || "Medium") - PRIORITIES.indexOf(a.values?.priority || "Medium")
      );
    if (type === "location") {
      const locs = (shoot.locations || []).map(s => s.toLowerCase());
      const score = sc => {
        const blob = Object.values(sc.values || {}).join(" ").toLowerCase();
        let idx = 9999;
        locs.forEach((l, i) => {
          if (blob.includes(l)) idx = Math.min(idx, i);
        });
        return idx;
      };
      scenes.sort((a, b) => score(a) - score(b));
    }
    patchScenes(scenes);
  }

  function addFile(kind, file) {
    const entry = { id: uid(), name: file.name, size: file.size, type: file.type, preview: "", status: "Pending", note: "" };
    const r = new FileReader();
    r.onload = () => {
      entry.preview = r.result;
      patch({ files: { ...shoot.files, [kind]: [entry, ...shoot.files[kind]] } });
    };
    if (file.type.startsWith("image/")) r.readAsDataURL(file);
    else patch({ files: { ...shoot.files, [kind]: [entry, ...shoot.files[kind]] } });
  }
  function setFileStatus(kind, id, status) {
    const bucket = [...shoot.files[kind]];
    const idx = bucket.findIndex(f => f.id === id);
    if (idx < 0) return;
    bucket[idx] = { ...bucket[idx], status };
    let next = { ...shoot.files, [kind]: bucket };
    if (status === "Approved" && kind !== "approved") {
      next.approved = [bucket[idx], ...shoot.files.approved];
    }
    patch({ files: next });
  }
  function setFileNote(kind, id, note) {
    const bucket = [...shoot.files[kind]];
    const idx = bucket.findIndex(f => f.id === id);
    if (idx < 0) return;
    bucket[idx] = { ...bucket[idx], note };
    patch({ files: { ...shoot.files, [kind]: bucket } });
  }

  const bodyStyle: React.CSSProperties = {
    maxHeight: "80svh",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  };

 return (
  <Dialog open onOpenChange={v => { if (!v) location.hash = ""; }}>
    <DialogContent
        className="max-w-none w-[95vw] h-[95svh] p-0 z-[50]"
        style={{ width: "min(95vw, 1100px)", maxWidth: "min(95vw, 1100px)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}   // keep this
        onCloseAutoFocus={(e) => e.preventDefault()}  // optional: prevents focus jump when closing
      >
      {/* Required for accessibility (can be visually hidden) */}
      <DialogHeader className="sr-only">
        <DialogTitle>Planner — {shoot?.name || "Untitled"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col h-full min-h-0">
        {/* Header bar */}
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="font-medium truncate">Planner — {shoot.name}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => (location.hash = `#callsheet:${shoot.id}`)}>
                <Printer className="h-4 w-4 mr-1" />
                Call Sheet
              </Button>
              <Button size="sm" variant="outline" onClick={duplicateShoot}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  const url = `${location.origin}/#planner:${shoot.id}`;
                  navigator.clipboard.writeText(url).then(() => alert("Link copied"));
                }}
              >
                Copy Link
              </Button>
              <Button size="sm" onClick={() => (location.hash = `#planner-mobile:${shoot.id}`)}>
                <Smartphone className="h-4 w-4 mr-1" />
                Shoot-Day
              </Button>
              <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => (location.hash = "")}>
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
          <div
            className="px-4 pb-6 space-y-6 flex-1 min-h-0 overflow-y-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
          {/* Overview */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label={<span className="inline-flex items-center gap-2">Name</span>}>
              <Input
                value={draft.name || ""}
                onChange={e => setField("name", e.target.value)}
                onBlur={() => commitField("name")}
              />
            </Field>

            <Field label="Date/Time">
              <Input
                type="datetime-local"
                value={draft.date || ""}
                onChange={e => setField("date", e.target.value)}
                onBlur={() => commitField("date")}
              />
            </Field>

            <Field label="Duration (min)">
              <Input
                type="number"
                value={draft.duration ?? 0}
                onChange={e => setField("duration", Number(e.target.value || 0))}
                onBlur={() => commitField("duration")}
              />
            </Field>

            <Field label="Locations">
              <Input
                value={draft.locations || ""}
                onChange={e => setField("locations", e.target.value)}
                onBlur={() => commitField("locations")}
              />
            </Field>

            <Field label="Weather">
              <Input
                value={draft.weather || ""}
                onChange={e => setField("weather", e.target.value)}
                onBlur={() => commitField("weather")}
              />
            </Field>

            <Field label="Time of Day">
              <Select
                value={draft.timeOfDay ?? ""}
                onValueChange={(v) => { setField("timeOfDay", v); commitField("timeOfDay"); }}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TIME_OF_DAY.map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>

              {/* Assigned Videographer */}
                {role === "admin" ? (
                  <Field label="Assigned Videographer">
                  <Select
                    value={shoot.assigned_user ?? "__none__"}
                    onValueChange={(v) =>
                      patch({ assigned_user: v === "__none__" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select videographer" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* NEVER an empty string value item */}
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {videographers.map((v) => (
                        <SelectItem key={v.user_id} value={v.user_id}>
                          {v.display_name || v.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                ) : null}

                <Field label="Assigned Videographer">
                  <Badge variant="secondary">
                    {shoot.assigned_user
                      ? (videographers.find(x => x.user_id === shoot.assigned_user)?.display_name || 'Assigned')
                      : 'Unassigned'}
                  </Badge>
                </Field>

               <Field label="General Notes" className="md:col-span-3">
                <Textarea
                  value={draft.notes || ""}
                  onChange={e => setField("notes", e.target.value)}
                  onBlur={() => commitField("notes")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Scenes / Content */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Scenes / Content</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={autoOrderScenes}>
                Auto-Order
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={addScene}>
                + Add Scene
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {(draft.scenes || []).map(sc => (
              <SceneCard
                key={sc.id}
                sc={sc}
                fields={fields}
                songs={store.songs}
                onDuplicate={() => duplicateScene(sc.id)}
                onRemove={() => removeScene(sc.id)}
                onChangeDraft={(k, v) => setSceneVal(sc.id, k, v)}   // update local draft as you type
                onCommit={() => commitScenes()}                      // save to store on blur
                onAddSongInline={(s) => onStore({ ...store, songs: [s, ...store.songs] })}
              />
            ))}

            {(!draft.scenes || draft.scenes.length === 0) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>No scenes yet.</span>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Files & Approval */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Files & Approval</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <FileBucket
                title="Raw Footage"
                files={shoot.files?.raw ?? []}
                onAdd={(f) => addFile("raw", f)}
                onStatus={(id: string, st: "Pending" | "Approved" | "Rejected") => setFileStatus("raw", id, st)}
                onNote={(id: string, n: string) => setFileNote("raw", id, n)}
              />
              <FileBucket
                title="Edits"
                files={shoot.files?.edits ?? []}
                onAdd={(f) => addFile("edits", f)}
                onStatus={(id: string, st: "Pending" | "Approved" | "Rejected") => setFileStatus("edits", id, st)}
                onNote={(id: string, n: string) => setFileNote("edits", id, n)}
              />
              <FileBucket
                title="Approved"
                files={shoot.files?.approved ?? []}
                onAdd={(f) => addFile("approved", f)}
                onStatus={(id: string, st: "Pending" | "Approved" | "Rejected") => setFileStatus("approved", id, st)}
                onNote={(id: string, n: string) => setFileNote("approved", id, n)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);


function SceneCard({
  sc,
  fields,
  songs,
  onDuplicate,
  onRemove,
  onChangeDraft,   // k, v -> update local draft only
  onCommit,        // commit draft.scenes to store (call commitScenes)
  onAddSongInline,
}: {
  sc: any;
  fields: any[];
  songs: string[];
  onDuplicate: () => void;
  onRemove: () => void;
  onChangeDraft: (k: string, v: any) => void;
  onCommit: () => void;
  onAddSongInline: (s: string) => void;
}) {
  const render = (f: any) => {
    const v = sc.values?.[f.key] ?? (f.kind === "checklist" ? [] : "");

    switch (f.kind) {
      case "text":
        return (
          <Input
            value={v}
            onChange={(e) => onChangeDraft(f.key, e.currentTarget.value)}
            onBlur={onCommit}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={v}
            onChange={(e) => onChangeDraft(f.key, e.currentTarget.value)}
            onBlur={onCommit}
          />
        );

      case "songs":
        return (
          <SongMultiSelect
            value={Array.isArray(v) ? v : []}
            options={songs}
            onChange={(val) => onChangeDraft(f.key, val)}
            onAdd={onAddSongInline}
            onBlurCommit={onCommit}
          />
        );

      case "status":
        return (
          <Select
            value={v || STATUSES[0]}
            onValueChange={(val) => onChangeDraft(f.key, val)}
            onOpenChange={(open) => !open && onCommit()}
          >
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        );

      case "priority":
        return (
          <Select
            value={v || PRIORITIES[1]}
            onValueChange={(val) => onChangeDraft(f.key, val)}
            onOpenChange={(open) => !open && onCommit()}
          >
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        );

      case "checklist":
        return (
          <Checklist
            value={Array.isArray(v) ? v : []}
            onChange={(val) => { onChangeDraft(f.key, val); onCommit(); }}
          />
        );

      default:
        return (
          <Input
            value={v}
            onChange={(e) => onChangeDraft(f.key, e.currentTarget.value)}
            onBlur={onCommit}
          />
        );
    }
  };

  return (
    <div className="rounded-xl border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{sc.values?.title || sc.title || "Scene"}</div>
        <div className="flex gap-2 print:hidden">
          <Button size="sm" variant="secondary" className="cursor-pointer" onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-1" /> Duplicate
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground inline-flex items-center gap-2">
              {f.label} <InfoTip text={`Field: ${f.label}`} />
            </Label>
            {render(f)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SongMultiSelect({
  value,
  options,
  onChange,
  onAdd,
  onBlurCommit,
}: {
  value: string[];
  options: string[];
  onChange: (vals: string[]) => void;
  onAdd: (s: string) => void;
  onBlurCommit?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [newSong, setNewSong] = React.useState("");

  const toggle = (val: string) => {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [val, ...value]);
  };

  const add = () => {
    const s = newSong.trim();
    if (!s) return;
    onAdd(s);
    onChange([s, ...value]);
    setNewSong("");
  };

  const list = options.filter((o) => o.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onBlurCommit?.();   // commit when the popover closes
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          {value.length ? `${value.length} selected` : "Select songs"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-2" side="bottom" align="start">
        <div className="space-y-2">
          <Input
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
          />

          <div className="max-h-[220px] overflow-y-auto rounded-md border">
            {list.map((s) => (
              <div key={s} className="flex items-center justify-between px-3 py-2">
                <span className="truncate">{s}</span>
                <Checkbox checked={value.includes(s)} onCheckedChange={() => toggle(s)} />
              </div>
            ))}

            {!list.length && (
              <div className="px-3 py-8 text-center text-muted-foreground text-sm">
                No matches
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add new song…"
              value={newSong}
              onChange={(e) => setNewSong(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add}>Add</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Checklist({ value, onChange }) {
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    onChange([text.trim(), ...value]);
    setText("");
  };
  const remove = i => onChange(value.filter((_, idx) => idx !== i));
  const toggle = i => {
    const it = value[i];
    const done = it.startsWith("[x] ");
    const next = done ? it.replace(/^\[x\]\s/, "") : `[x] ${it}`;
    onChange(value.map((v, idx) => (idx === i ? next : v)));
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Add checklist item" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} />
        <Button size="sm" onClick={add}>Add</Button>
      </div>
      <div className="space-y-1">
        {value.map((it, i) => {
          const done = it.startsWith("[x] ");
          const label = done ? it.replace(/^\[x\]\s/, "") : it;
          return (
            <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-accent/40">
              <button className={`text-left flex-1 ${done ? "line-through opacity-60" : ""}`} onClick={() => toggle(i)}>{label}</button>
              <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {value.length === 0 && <div className="text-sm text-muted-foreground">No items yet.</div>}
      </div>
    </div>
  );
}

function FileBucket({ title, files, onAdd, onStatus, onNote }) {
  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{title}</div>
        <label className="text-xs cursor-pointer inline-flex items-center gap-1">
          <Upload className="h-3 w-3" /> Add
          <input type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) onAdd(e.target.files[0]); e.currentTarget.value = ""; }} />
        </label>
      </div>
      <div className="space-y-1 text-sm">
        {files.map(f => (
          <div key={f.id} className="flex flex-col gap-1 bg-accent/30 px-2 py-2 rounded">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <Badge variant="secondary">{(f.size / 1024).toFixed(0)} KB</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={f.status || "Pending"} onValueChange={v => onStatus(f.id, v)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Approval note / re‑shoot reason" value={f.note || ""} onChange={e => onNote(f.id, e.target.value)} />
            </div>
          </div>
        ))}
        {files.length === 0 && <div className="text-muted-foreground text-sm">No files yet.</div>}
      </div>
    </div>
  );
}



function HelpPage() {
  const faqs = [
    { q: "What is the Vault?", a: "Unscheduled shoots/ideas. When you get a last‑minute window, pull one from the Vault and assign a date." },
    { q: "Where do approvals happen?", a: "Inside each shoot → Files & Approval. Set each file to Approved/Rejected and add a quick note." },
    { q: "How do I re‑order scenes fast?", a: "Open a shoot → Scenes → Auto‑order → by Priority or by Location." },
    { q: "What if I lose data?", a: "Settings → About & Data → Restore from the latest backup or Import JSON you previously exported." },
    { q: "Mobile on set?", a: "Open any shoot → Shoot‑Day. Big tap targets, offline‑friendly, sticky header." }
  ];
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-none bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl md:text-3xl tracking-tight">Videographer SOP</CardTitle>
          <p className="text-sm text-muted-foreground">Learn the workflow in minutes. Plan it. Shoot it. Approve it.</p>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-background/50 p-4">
            <div className="text-xs uppercase text-muted-foreground mb-2">Quick Start</div>
            <ol className="space-y-2 text-sm">
              <li>1. Dashboard → <b>New Shoot</b> (Blank or Template)</li>
              <li>2. Fill <b>Overview</b> (date, duration, locations, notes)</li>
              <li>3. Add <b>Scenes</b> and pick <b>Songs</b></li>
              <li>4. On set: open <b>Shoot‑Day</b> view</li>
              <li>5. Upload to <b>Files & Approval</b> and mark status</li>
            </ol>
          </div>
          <div className="rounded-2xl border bg-background/50 p-4">
            <div className="text-xs uppercase text-muted-foreground mb-2">Workflow</div>
            <div className="text-sm space-y-1">
              <div>• Plan → Dashboard, Templates, Vault</div>
              <div>• Shoot → Shoot‑Day checklist</div>
              <div>• Post → Files & Approval (per‑file status + note)</div>
              <div>• Deliver → Export/Backup or push to Drive</div>
            </div>
          </div>
          <div className="rounded-2xl border bg-background/50 p-4">
            <div className="text-xs uppercase text-muted-foreground mb-2">Tips</div>
            <ul className="list-disc ml-4 text-sm space-y-1">
              <li>Use <b>Auto‑order</b> to optimize by light/location</li>
              <li><b>Duplicate</b> a shoot to iterate quickly</li>
              <li>Use <b>Songs</b> settings to edit the library</li>
              <li>Dark/Light mode persists</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm"><CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent>
        <Accordion type="single" collapsible className="w-full" style={{ scrollbarGutter: 'stable' }}>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm md:text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm"><CardHeader>
          <CardTitle>Standards & Checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border p-4 bg-background/50">
            <div className="font-medium mb-2">Shoot‑Ready</div>
            <ul className="list-disc ml-4 space-y-1">
              <li>Batteries/Media checked</li>
              <li>White balance and exposure tested</li>
              <li>Scene order confirmed</li>
              <li>Audio monitoring if needed</li>
            </ul>
          </div>
          <div className="rounded-xl border p-4 bg-background/50">
            <div className="font-medium mb-2">Deliverables</div>
            <ul className="list-disc ml-4 space-y-1">
              <li>All scenes captured</li>
              <li>Files uploaded with clear names</li>
              <li>Per‑file status + notes set</li>
              <li>Final approved files exported</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShootDayMobile({ shoot, store, onStore }) {
  const patch = p => onStore({ shoots: store.shoots.map(s => (s.id === shoot.id ? { ...s, ...p } : s)) });
  const patchSafe = (p: any) => setTimeout(() => patch(p), 0);
  const patchScenes = n => patch({ scenes: n });
  const toggleDone = id => {
    patchScenes((shoot.scenes || []).map(sc => (sc.id === id ? { ...sc, done: !sc.done } : sc)));
  };
  return (
  <Dialog open onOpenChange={v => { if (!v) location.hash = ""; }}>
    <DialogContent className="w-screen max-w-none h-[100svh] p-0 overflow-hidden">
      <DialogHeader className="sr-only">
        <DialogTitle>Shoot-Day — {shoot?.name || "Untitled"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="font-medium truncate">Shoot-Day — {shoot.name}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="cursor-pointer"
                onClick={() => (location.hash = `#planner:${shoot.id}`)}
              >
                Back
              </Button>
              <Button size="sm" onClick={() => (location.hash = "")}>Close</Button>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 pb-6"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="text-sm text-muted-foreground mb-3">
            {(Array.isArray(shoot.locations) ? shoot.locations.join(", ") : (shoot.locations || ""))} • {shoot.timeOfDay || "—"} • {shoot.duration}m
          </div>

          {(shoot.scenes || []).map(sc => (
            <div key={sc.id} className={`rounded-xl border p-3 mb-2 ${sc.done ? "opacity-70" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">{sc.values?.title || sc.title || "Scene"}</div>
                <Checkbox checked={!!sc.done} onCheckedChange={() => toggleDone(sc.id)} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(sc.values?.description || "").slice(0, 140)}
              </div>
              <div className="mt-2 text-xs">
                Songs: {(Array.isArray(sc.values?.songs) ? sc.values.songs : []).join(" • ") || "—"}
              </div>
            </div>
          ))}

          {(!shoot.scenes || shoot.scenes.length === 0) && (
            <div className="text-sm text-muted-foreground">No scenes yet.</div>
          )}
        </div>
      </div>
    </DialogContent>
  </Dialog>
);


function CallSheetPrint({ shoot }) {
  const back = () => {
    location.hash = `#planner:${shoot.id}`;
    setTimeout(() => window.print(), 0);
  };
  return (
    <Dialog open onOpenChange={v => { if (!v) location.hash = `#planner:${shoot.id}`; }}>
      <DialogContent className="max-w-3xl w-[95vw] p-0">
      <div className="p-4 print:hidden flex items-center justify-between border-b">
  <div className="font-medium">Call Sheet – {shoot.name}</div>
  <div className="flex gap-2">
  <Button variant="outline" onClick={() => window.print()}>
    <Printer className="h-4 w-4 mr-1" />
    Print
  </Button>
  <Button variant="secondary" onClick={back}>
    <X className="h-4 w-4 mr-1" />
    Close
  </Button>
</div>
</div>
        <div className="p-4 text-sm print:p-0">
          <h2 className="text-lg font-semibold mb-2">{shoot.name}</h2>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <div>
                <b>Date/Time:</b> {shoot.date ? new Date(shoot.date).toLocaleString() : "Unscheduled"}
              </div>
              <div>
                <b>Duration:</b> {shoot.duration} min
              </div>
              <div>
                <b>Time of Day:</b> {shoot.timeOfDay || "—"}
              </div>
            </div>
            <div>
              <div>
                <b>Locations:</b> {(shoot.locations || []).join(" • ") || "—"}
              </div>
              <div>
                <b>Weather:</b> {shoot.weather || "—"}
              </div>
              <div>
                <b>Notes:</b> {shoot.notes || "—"}
              </div>
            </div>
          </div>
          <h3 className="font-medium mb-1">Ordered Scenes</h3>
          <ol className="list-decimal ml-5 space-y-1">
            {(shoot.scenes || []).map((sc, i) => (
              <li key={i}>
                <b>{sc.values?.title || sc.title || `Scene ${i + 1}`}</b> — {sc.values?.description?.slice(0, 120) || "—"}
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
