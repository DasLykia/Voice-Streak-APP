
export const calculateStreaks = (
  history: { [date: string]: boolean | number },
  sickDays: { [date: string]: boolean },
  schedule: number[] = [] // 0=Sun, 1=Mon...
): { currentStreak: number; longestStreak: number } => {
  
  const normalizeDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasTraining = (dateStr: string) => !!history[dateStr];
  const isSick = (dateStr: string) => !!sickDays[dateStr];
  
  const isScheduled = (date: Date) => {
      // If schedule is empty, we assume the user hasn't configured it.
      // Defaulting to "Every day is a training day" ensures standard streak behavior (must train daily).
      // If we defaulted to "No days are training days", the streak would never break, which is confusing.
      if (schedule.length === 0) return true; 
      
      const day = date.getDay(); // 0 Sun, 1 Mon...
      return schedule.includes(day);
  };

  const subDays = (d: Date, n: number) => {
      const newD = new Date(d);
      newD.setDate(d.getDate() - n);
      return newD;
  };

  const addDays = (d: Date, n: number) => {
      const newD = new Date(d);
      newD.setDate(d.getDate() + n);
      return newD;
  };

  // --- 1. Current Streak ---
  let currentStreak = 0;
  let pointer = new Date(); // Start Today
  
  // If today is a training day and we haven't trained yet, it shouldn't break the streak from yesterday.
  // So we first check if today counts.
  
  const todayStr = normalizeDate(pointer);
  
  if (hasTraining(todayStr)) {
      currentStreak = 1;
  }
  
  // Move pointer to yesterday to start checking history
  pointer = subDays(pointer, 1);

  // Safety break
  let safety = 0;
  while (safety < 5000) { // Look back approx 13 years max
      safety++;
      const pStr = normalizeDate(pointer);
      
      if (hasTraining(pStr)) {
          currentStreak++;
      } else {
          // No training on this day.
          if (isSick(pStr)) {
              // Sick Day: Bridges the gap. Streak continues.
          } else if (!isScheduled(pointer)) {
              // Off Day: Bridges the gap. Streak continues.
          } else {
              // It was a Scheduled day, Not Sick, and No Training.
              // Streak is broken.
              break;
          }
      }
      pointer = subDays(pointer, 1);
  }

  // --- 2. Longest Streak ---
  // To find the longest streak, we must scan the entire relevant timeline.
  // We find the min and max dates from history to define the range.
  
  const allDates = [...Object.keys(history), ...Object.keys(sickDays)].sort();
  if (allDates.length === 0) return { currentStreak, longestStreak: currentStreak };

  const firstDateStr = allDates[0];
  const lastDateStr = allDates[allDates.length - 1]; // Or Today? Let's use Today to capture current streak potentially.
  
  // Parse start date
  const [sy, sm, sd] = firstDateStr.split('-').map(Number);
  let scanPointer = new Date(sy, sm - 1, sd);
  
  // End date is Today
  const endPointer = new Date();
  endPointer.setHours(0,0,0,0);

  let tempStreak = 0;
  let maxStreak = 0;
  
  safety = 0;
  // Scan forward from first activity to today
  while (scanPointer <= endPointer && safety < 10000) {
      safety++;
      const pStr = normalizeDate(scanPointer);
      
      if (hasTraining(pStr)) {
          tempStreak++;
      } else {
          if (isSick(pStr) || !isScheduled(scanPointer)) {
              // Bridge day, keep streak alive but don't increment? 
              // Actually, usually "Streak" is count of consecutive actions.
              // If I train Mon (1), Tue Off, Wed (1), is my streak 2 or 3?
              // Most trackers count the span of days where you adhered to schedule.
              // But here we'll stick to "Count of Sessions in Streak" logic for consistency with currentStreak logic above.
              // Wait, above `currentStreak` increments ONLY on training.
              // So if Mon(Train), Tue(Off), Wed(Train) -> Streak is 2.
              // This is consistent.
          } else {
              // Broken
              if (tempStreak > maxStreak) maxStreak = tempStreak;
              tempStreak = 0;
          }
      }
      scanPointer = addDays(scanPointer, 1);
  }
  
  if (tempStreak > maxStreak) maxStreak = tempStreak;

  // Ensure longest is at least current
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  return { currentStreak, longestStreak: maxStreak };
};
