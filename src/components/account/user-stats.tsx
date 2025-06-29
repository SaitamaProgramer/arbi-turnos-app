
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, FileText, CheckCircle } from "lucide-react";
import type { UserStats } from "@/types";

interface UserStatsProps {
  stats: UserStats;
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
            <FileText className="mx-auto h-8 w-8 text-accent mb-2" />
            <p className="text-2xl font-bold">{stats.postulationsCount}</p>
            <p className="text-sm text-muted-foreground">Postulaciones</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
