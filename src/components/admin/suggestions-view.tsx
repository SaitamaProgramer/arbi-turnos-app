
'use client';

import type { Suggestion } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Calendar, MessageSquare, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface SuggestionsViewProps {
  suggestions: Suggestion[];
}

export default function SuggestionsView({ suggestions }: SuggestionsViewProps) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border rounded-lg">
        <AlertTriangle className="h-10 w-10 mb-3 text-yellow-500" />
        <h3 className="text-lg font-semibold">No hay Sugerencias</h3>
        <p className="text-sm">Aún no se han recibido sugerencias de los usuarios.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MessageSquare className="text-primary"/>
            Sugerencias de Usuarios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{suggestion.suggestionText}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2 mt-2">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{suggestion.userName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <time dateTime={suggestion.submittedAt}>
                      {format(parseISO(suggestion.submittedAt), "dd/MM/yy 'a las' HH:mm", { locale: es })}
                    </time>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
