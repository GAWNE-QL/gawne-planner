"use client";

export const dynamic = "force-dynamic";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus } from "lucide-react";


type Template = {
    id: string;
    name: string;
    fields: unknown[];
    overview?: { locations?: string[] };
  };

type QuickActionsProps = {
    onBlank: () => void;
    onFromTemplate: (t: Template) => void;
    templates: Template[];
  };

export function QuickActions({ onBlank, onFromTemplate, templates }: QuickActionsProps) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Shoot
          </Button>
        </SheetTrigger>
  
        {/* ⬇️ Bump z-index so it's above the overlay */}
        <SheetContent className="z-[70] sm:max-w-md pointer-events-auto">
          <SheetHeader>
            <SheetTitle>Start</SheetTitle>
          </SheetHeader>
  
          <div className="mt-4 space-y-3">
            <Button className="w-full" variant="secondary" onClick={onBlank}>
              Blank
            </Button>
  
            <div className="text-xs uppercase tracking-wider text-muted-foreground pt-2">
              From Template
            </div>
  
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => onFromTemplate(t)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Fields: {t.fields.length} • Locations:{" "}
                    {t.overview?.locations?.join(" • ") || "—"}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }