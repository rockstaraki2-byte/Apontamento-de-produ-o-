export interface ProductionSchedule {
  id: string;
  workingDays: number[];
  startHour: string;
  endHour: string;
  lunchStart: string;
  lunchEnd: string;
  coffeeBreaks: { start: string; end: string }[];
  holidays: string[];
}

export interface ExtraHourEntry {
  id: string;
  date: string;
  sectorId: string;
  startHour: string;
  endHour: string;
}

export const DEFAULT_SCHEDULE: ProductionSchedule = {
  id: "global",
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  startHour: "07:15",
  endHour: "17:48",
  lunchStart: "12:00", // Standard lunch range
  lunchEnd: "13:00",
  coffeeBreaks: [
    { start: "10:00", end: "10:15" },
    { start: "15:00", end: "15:15" }
  ],
  holidays: []
};

// Retrieve schedule from localStorage with fallback to default
export function getProductionSchedule(): ProductionSchedule {
  try {
    const data = localStorage.getItem("production_schedule");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loaded production schedule:", e);
  }
  return DEFAULT_SCHEDULE;
}

// Retrieve extra hours from localStorage
export function getExtraHours(): ExtraHourEntry[] {
  try {
    const data = localStorage.getItem("extra_hours");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loaded extra hours:", e);
  }
  return [];
}

// Check if a specific timestamp is outside production working hours
export function isOutsideWorkingHours(timestamp: number, sectorRole: string): boolean {
  const schedule = getProductionSchedule();
  const extraHours = getExtraHours();
  const date = new Date(timestamp);

  // 1. Format date (YYYY-MM-DD) and hour (HH:MM)
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const yyyymmdd = `${yyyy}-${mm}-${dd}`;
  
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  const hhmm = `${hh}:${min}`;

  // 2. Extra hours: if there is an override for this sector on this specific day and time.
  const activeExtra = extraHours.find(
    eh => eh.date === yyyymmdd && eh.sectorId === sectorRole && hhmm >= eh.startHour && hhmm <= eh.endHour
  );
  if (activeExtra) {
    return false; // NOT outside! Extra time is a valid working period.
  }

  // 3. Holidays override
  if (schedule.holidays && schedule.holidays.includes(yyyymmdd)) {
    return true; // Holiday means closed / outside working hours
  }

  // 4. Default working days checked
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
  if (!schedule.workingDays.includes(day)) {
    return true; // Not a working day
  }

  // 5. Normal start / end range of the working day
  if (hhmm < schedule.startHour || hhmm > schedule.endHour) {
    return true; // Outside shift start and end
  }

  // 6. Special rule: INJETORA does not pause or deduct for lunch or coffee breaks
  const uninterruptedSectors = ["INJETORA"];
  if (uninterruptedSectors.includes((sectorRole || "").toUpperCase().trim())) {
    return false; // Active! (No lunch or coffee breaks deduction for uninterrupted sectors)
  }

  // 7. Lunch break check
  if (schedule.lunchStart && schedule.lunchEnd) {
    if (hhmm >= schedule.lunchStart && hhmm < schedule.lunchEnd) {
      return true; // During lunch
    }
  }

  // 8. Coffee breaks check
  if (schedule.coffeeBreaks) {
    for (const b of schedule.coffeeBreaks) {
      if (hhmm >= b.start && hhmm < b.end) {
        return true; // During coffee break
      }
    }
  }

  return false;
}

// Main work duration calculation: excludes holidays, weekends, lunch breaks and coffee breaks correctly.
export function calculateWorkingMillis(start: number, end: number, roleOverride?: string) {
  if (end <= start) return 0;

  // Resolve active role
  let role = roleOverride || "OUTRO";
  if (!roleOverride) {
    try {
      const savedUser = localStorage.getItem("imperio_logged_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        role = u.role || "OUTRO";
      }
    } catch (e) {}
  }

  // Safeguard: Limit calculations to a maximum of 15 days to protect performance
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  const clampedStart = Math.max(start, end - fifteenDays);

  let totalMillis = 0;
  let current = clampedStart;
  const step = 60000; // 1 minute resolution

  while (current < end) {
    const next = Math.min(current + step, end);
    const duration = next - current;

    if (!isOutsideWorkingHours(current, role)) {
      totalMillis += duration;
    }
    current = next;
  }

  // Physical elapsed check fallback (under 3 mins)
  const physicalElapsed = end - start;
  if (totalMillis <= 0 && physicalElapsed > 0 && physicalElapsed < 3 * 60 * 1000) {
    return physicalElapsed;
  }

  return totalMillis;
}
