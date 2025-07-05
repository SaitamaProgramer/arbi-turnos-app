import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, isBefore, differenceInHours } from 'date-fns';
import type { ClubSpecificMatch, MatchAssignment } from "@/types";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Centralized utility to convert snake_case DB rows to camelCase objects
export function rowsToType<T>(rows: any[]): T[] {
    return rows.map(row => {
        const newRow: { [key: string]: any } = {};
        for (const key in row) {
            const camelCaseKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newRow[camelCaseKey] = row[key];
        }
        return newRow as T;
    });
}


export const isMatchEditable = (matchDateStr: string, matchTimeStr: string): boolean => {
  try {
    const now = new Date();
    // The date from DB is like "2024-07-30" and time is "15:00"
    // We need to construct a full ISO string like "2024-07-30T15:00:00"
    const matchDateTime = parseISO(`${matchDateStr}T${matchTimeStr}:00`);
    
    // Check if the match is in the past
    if (isBefore(matchDateTime, now)) return false; 
    
    const hoursUntilMatch = differenceInHours(matchDateTime, now);
    
    // Postulation is editable if the match is 12 hours or more away.
    return hoursUntilMatch >= 12; 
  } catch (e) {
    console.error("Error parsing match date/time for editability check:", matchDateStr, matchTimeStr, e);
    return false; // Safely default to not editable on error
  }
};


export const isPostulationEditable = (
    selectedMatches: ClubSpecificMatch[],
    assignmentsForThisUserInThisClub: MatchAssignment[]
): boolean => {
  if (!selectedMatches || selectedMatches.length === 0) return true;

  // 1. Check if any of the selected matches are already assigned to this user
  const isAnySelectedMatchAssignedToUser = selectedMatches.some(selectedMatch =>
    assignmentsForThisUserInThisClub.some(assignment => assignment.matchId === selectedMatch.id)
  );
  if (isAnySelectedMatchAssignedToUser) {
    return false;
  }

  // 2. Check date-based editability for all matches
  const allMatchesEditableByDate = selectedMatches.every(match => isMatchEditable(match.date, match.time));
  if (!allMatchesEditableByDate) {
    return false;
  }
  
  return true; // All checks passed
};
