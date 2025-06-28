
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, isBefore, startOfDay } from 'date-fns';
import type { ClubSpecificMatch, MatchAssignment } from "./types";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isMatchEditable = (matchDateStr: string): boolean => {
  try {
    // Dates from the database might not have a time component, so parseISO is robust
    const today = startOfDay(new Date());
    const mDate = startOfDay(parseISO(matchDateStr)); 
    
    // Check if the match date is in the past
    if (isBefore(mDate, today)) return false; 
    
    // Calculate the difference in days
    const diffInDays = (mDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    
    // Postulation is editable if the match is more than 2 days away.
    // i.e., 3 days away or more is editable. 2, 1, 0 days away is not.
    return diffInDays > 2; 
  } catch (e) {
    console.error("Error parsing match date for editability check:", matchDateStr, e);
    return false; // Safely default to not editable on error
  }
};


export const isPostulationEditable = (
    selectedMatches: ClubSpecificMatch[],
    assignmentsForThisUserInThisClub: Omit<MatchAssignment, 'id'| 'clubId' | 'assignedAt'>[]
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
  const allMatchesEditableByDate = selectedMatches.every(match => isMatchEditable(match.date));
  if (!allMatchesEditableByDate) {
    return false;
  }
  
  return true; // All checks passed
};

    