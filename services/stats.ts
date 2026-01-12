export const calculateStreaks = (
  history: { [date: string]: boolean },
  sickDays: { [date: string]: boolean }
): { currentStreak: number; longestStreak: number } => {
  // Normalize all dates to Local YYYY-MM-DD strings to ensure consistency
  // regardless of how they were stored (toDateString vs YYYY-MM-DD)
  const normalizeDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    // Handle "Invalid Date" gracefully if happens
    if (isNaN(d.getTime())) return "";
    
    // Construct local YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const activeDates = new Set<string>();

  // Process history
  Object.keys(history).forEach(d => {
    const norm = normalizeDate(d);
    if (norm) activeDates.add(norm);
  });

  // Process sick days
  Object.keys(sickDays).forEach(d => {
    const norm = normalizeDate(d);
    if (norm) activeDates.add(norm);
  });

  // Convert to timestamps (Local Midnight) for sorting/math
  // We treat the string "YYYY-MM-DD" as if it is local time 00:00:00
  const sortedDates = Array.from(activeDates).sort(); // Lexicographical sort works for YYYY-MM-DD

  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // 1. Calculate Longest Streak
  let maxStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    // Parse manually to avoid UTC conversion issues with new Date("YYYY-MM-DD")
    const [y, m, d] = dateStr.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);

    if (tempStreak === 0) {
      tempStreak = 1;
    } else if (prevDate) {
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        tempStreak = 1;
      }
    }
    prevDate = currentDate;
  }
  if (tempStreak > maxStreak) maxStreak = tempStreak;

  // 2. Calculate Current Streak
  const today = new Date();
  const todayStr = normalizeDate(today.toDateString());
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = normalizeDate(yesterday.toDateString());

  let currentStreak = 0;
  // Streak is valid if it includes Today OR Yesterday (if we haven't trained today yet)
  let tailDateStr = "";

  if (activeDates.has(todayStr)) {
    tailDateStr = todayStr;
  } else if (activeDates.has(yesterdayStr)) {
    tailDateStr = yesterdayStr;
  }

  if (tailDateStr) {
    currentStreak = 1;
    let [y, m, d] = tailDateStr.split('-').map(Number);
    let checkDate = new Date(y, m - 1, d);

    // Count backwards
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const checkStr = `${year}-${month}-${day}`;

      if (activeDates.has(checkStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak;

  return { currentStreak, longestStreak: maxStreak };
};
