'use client';

import { useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ImageDown } from 'lucide-react';
import type { ClubSpecificMatch, User, MatchAssignment } from '@/types';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface AssignmentsPublicationViewProps {
  clubName: string;
  definedMatches: ClubSpecificMatch[];
  clubMembers: User[];
  matchAssignments: MatchAssignment[];
}

export function AssignmentsPublicationView({
  clubName,
  definedMatches,
  clubMembers,
  matchAssignments,
}: AssignmentsPublicationViewProps) {
  const publicationRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const upcomingScheduledMatches = definedMatches
    .filter(match => match.status === 'scheduled' && (isFuture(parseISO(match.date)) || isToday(parseISO(match.date))))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const getMemberById = (userId: string) => clubMembers.find(u => u.id === userId);

  const handleDownloadImage = () => {
    if (!publicationRef.current) return;
    setIsLoading(true);

    htmlToImage.toPng(publicationRef.current, { 
        cacheBust: true, 
        backgroundColor: '#ffffff', // Explicitly set background
        pixelRatio: 2 // Increase resolution for better quality
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `asignaciones-${clubName.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  const handlePrint = () => {
      window.print();
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-2 mb-4 no-print">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2" />
          Imprimir / Guardar como PDF
        </Button>
        <Button onClick={handleDownloadImage} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <ImageDown className="mr-2" />}
          {isLoading ? 'Generando...' : 'Descargar como Imagen'}
        </Button>
      </div>

      <div ref={publicationRef} className="bg-white p-6 printable-area">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{clubName}</h2>
          <p className="text-lg text-gray-600">Programación de Partidos</p>
        </div>

        {upcomingScheduledMatches.length > 0 ? (
          <div className="space-y-6">
            {upcomingScheduledMatches.map(match => {
              const assignmentsForMatch = matchAssignments.filter(a => a.matchId === match.id);
              const assignedReferees = assignmentsForMatch
                .filter(a => a.assignmentRole === 'referee')
                .map(a => getMemberById(a.assignedRefereeId)?.name)
                .filter(Boolean);
              const assignedAssistants = assignmentsForMatch
                .filter(a => a.assignmentRole === 'assistant')
                .map(a => getMemberById(a.assignedRefereeId)?.name)
                .filter(Boolean);
              
              return (
                <div key={match.id} className="border border-gray-200 rounded-lg p-4 break-inside-avoid">
                  <p className="text-sm font-bold text-blue-700 capitalize">
                    {format(parseISO(match.date), "EEEE dd 'de' MMMM", { locale: es })}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 mt-1">{match.description}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    <span>{match.time} hs.</span> | <span>{match.location}</span>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {assignedReferees.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Árbitro(s):</h4>
                        <p className="text-sm text-gray-600">{assignedReferees.join(', ')}</p>
                      </div>
                    )}
                    {assignedAssistants.length > 0 && (
                      <div className="mt-2">
                        <h4 className="font-semibold text-sm text-gray-700">Asistente(s):</h4>
                        <p className="text-sm text-gray-600">{assignedAssistants.join(', ')}</p>
                      </div>
                    )}
                    {assignedReferees.length === 0 && assignedAssistants.length === 0 && (
                        <p className="text-sm text-gray-400 italic">Sin asignaciones por el momento.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No hay partidos programados en el futuro cercano.</p>
        )}
        <div className="text-center text-xs text-gray-400 mt-8">
            Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      </div>
    </div>
  );
}
