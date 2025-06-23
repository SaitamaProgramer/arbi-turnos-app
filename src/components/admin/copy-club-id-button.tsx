
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

export default function CopyClubIdButton({ clubId }: { clubId: string }) {
    const { toast } = useToast();

    const copyClubId = () => {
        if (clubId) {
            navigator.clipboard.writeText(clubId)
                .then(() => {
                    toast({ title: "Código Copiado", description: "El código de tu club ha sido copiado al portapapeles." });
                })
                .catch(err => {
                    toast({ title: "Error al Copiar", description: "No se pudo copiar el código.", variant: "destructive" });
                });
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={copyClubId}>
            <Copy size={14} className="mr-1" /> Copiar Código
        </Button>
    );
}
