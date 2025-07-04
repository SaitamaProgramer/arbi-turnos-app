
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, FileText, CheckCircle, XCircle, List, Calendar } from "lucide-react";
import type { UserStats, UserStatMatch } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserStatsProps {
  stats: UserStats;
}

function MatchList({ matches }: { matches: UserStatMatch[] }) {
    if (matches.length === 0) {
        return <p className="text-sm text-muted-foreground px-4 py-2">No hay partidos para mostrar.</p>;
    }
    return (
        <ul className="space-y-3 text-sm text-muted-foreground list-disc pl-8 pr-4 py-2">
            {matches.map((match, index) => (
                <li key={index}>
                    <span className="font-semibold text-foreground">{match.description}</span> ({match.clubName})
                    <p className="text-xs flex items-center gap-1 mt-0.5">
                        <Calendar size={12}/> {format(parseISO(match.date), "dd/MM/yyyy", { locale: es })}
                    </p>
                </li>
            ))}
        </ul>
    );
}


export default function UserStats({ stats }: UserStatsProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center gap-2">
          <BarChart className="text-primary"/>
          Mis Estadísticas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <Users className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.associationsCount}</p>
            <p className="text-sm text-muted-foreground">Asociaciones</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.refereedMatchesCount}</p>
            <p className="text-sm text-muted-foreground">Partidos Dirigidos</p>
          </div>
           <div className="p-4 bg-muted/50 rounded-lg">
            <XCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-2xl font-bold">{stats.cancelledMatchesCount}</p>
            <p className="text-sm text-muted-foreground">Partidos Cancelados</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-accent mb-2" />
            <p className="text-2xl font-bold">{stats.postulationsCount}</p>
            <p className="text-sm text-muted-foreground">Postulaciones</p>
          </div>
        </div>

         <Accordion type="multiple" className="w-full">
            <AccordionItem value="played-matches">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-green-500"/>
                        Historial de Partidos Dirigidos ({stats.refereedMatches.length})
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <MatchList matches={stats.refereedMatches} />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancelled-matches">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                     <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-destructive"/>
                        Historial de Partidos Cancelados ({stats.cancelledMatches.length})
                     </div>
                </AccordionTrigger>
                <AccordionContent>
                    <MatchList matches={stats.cancelledMatches} />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
