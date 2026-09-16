export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isValidTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export const formatClock = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const formatDuration = (startTime: string, endTime: string) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const minutes = end > start ? end - start : (24 * 60 - start) + end;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} hr`;
  return `${hours}.${Math.round(remainder / 6)} hr`;
};

export const blockWindowForDate = (date: Date, startTime: string, endTime: string) => {
  const start = new Date(date);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(date);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  end.setHours(endHour, endMinute, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
};

type ScheduledBlock = { startTime: string; endTime: string };

export const millisecondsUntilNextBlockBoundary = (
  blocks: ScheduledBlock[],
  now = new Date(),
) => {
  if (!blocks.length) return 60 * 60 * 1000;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  let nextBoundary = Number.POSITIVE_INFINITY;

  for (const day of [yesterday, now, tomorrow]) {
    for (const block of blocks) {
      const { start, end } = blockWindowForDate(
        day,
        block.startTime,
        block.endTime,
      );
      for (const boundary of [start, end]) {
        if (boundary > now) nextBoundary = Math.min(nextBoundary, boundary.getTime());
      }
    }
  }

  return Number.isFinite(nextBoundary)
    ? Math.max(250, nextBoundary - now.getTime() + 100)
    : 60 * 60 * 1000;
};
