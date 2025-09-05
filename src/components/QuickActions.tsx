"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type Template = { id: string; name: string };
type Props = {
  onBlank: () => void;
  onFromTemplate: (t: Template) => void;
  templates: Template[];
};

export function QuickActions({ onBlank, onFromTemplate, templates }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          New Shoot
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[92vw] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Start</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          <Button className="w-full justify-start cursor-pointer" onClick={onBlank}>
            <Plus className="h-4 w-4 mr-2" />
            Blank shoot
          </Button>

          <div className="text-xs text-muted-foreground px-1">From template</div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {templates.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                className="w-full justify-start cursor-pointer"
                onClick={() => onFromTemplate(t)}
              >
                {t.name}
              </Button>
            ))}

            {templates.length === 0 && (
              <div className="text-sm text-muted-foreground px-1">
                No templates yet.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
