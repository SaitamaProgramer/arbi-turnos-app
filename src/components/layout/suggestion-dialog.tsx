
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitSuggestion } from "@/lib/actions";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Label } from "@/components/ui/label";

export function SuggestionDialog() {
  const [suggestion, setSuggestion] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (suggestion.trim().length < 10) {
      toast({
        title: "Sugerencia muy corta",
        description: "Por favor, escribe al menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await submitSuggestion(suggestion);
      if (result.success) {
        toast({
          title: "¡Sugerencia Enviada!",
          description: "Gracias por ayudarnos a mejorar.",
        });
        setSuggestion("");
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary">
          Dejar una sugerencia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="text-primary"/>
            Envíanos tus Sugerencias
          </DialogTitle>
          <DialogDescription>
            ¿Tienes alguna idea para mejorar ArbiTurnos? Nos encantaría escucharla. Tu opinión es muy valiosa para nosotros.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="suggestion-text">Tu sugerencia</Label>
            <Textarea
              id="suggestion-text"
              placeholder="Escribe tu sugerencia aquí..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={5}
              disabled={isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending || suggestion.trim().length < 10}>
            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
            {isPending ? "Enviando..." : "Enviar Sugerencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
