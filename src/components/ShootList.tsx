export const dynamic = "force-dynamic";
import React from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin } from "lucide-react";

const STATUSES = ["Not Started", "In Progress", "Shot", "In Edit", "Approved"];

export function ShootList({ items, onOpen, onArchive, onStatus, onDelete, confirmDeletions }) {
    const hasItems = Array.isArray(items) && items.length > 0;
  
    return (
      <div className="space-y-3" suppressHydrationWarning>
        {hasItems ? (
          items.map(s => (
            <div key={s.id} className="p-3 rounded-xl border flex items-center justify-between hover:bg-accent/40 transition">
              <div className="flex-1 min-w-0 space-y-1 cursor-pointer" onClick={() => onOpen(s)}>
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center overflow-hidden">
                  <span className="truncate">{s.date ? new Date(s.date).toLocaleString() : "Unscheduled"}</span>
                  {Array.isArray(s.locations) && s.locations.length ? (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {s.locations.join(" • ")}
                    </span>
                  ) : null}
                  {s.timeOfDay ? <span className="truncate">{s.timeOfDay}</span> : null}
                  <span>Scenes: {s.scenes?.length || 0}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Select value={s.status || "Plan"} onValueChange={v => onStatus(s, v)}>
                  <SelectTrigger className="w-28 md:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Plan", ...STATUSES].map(x => (
                      <SelectItem key={x} value={x}>{x}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => onOpen(s)}>Open</Button>
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => onArchive(s)}>Archive</Button>
                {confirmDeletions ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this shoot?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(s)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => onDelete(s)}>Delete</Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    );
  }
  