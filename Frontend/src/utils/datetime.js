// Shared helpers for "đặt xe theo giờ" (schedule a future pickup time).
// Values are kept as <input type="datetime-local"> strings (local time, no
// timezone suffix) end-to-end in the UI, and only converted to an ISO
// string right before hitting the API — matches the min/max window
// enforced server-side in Backend/utils/scheduleValidation.js.
const MIN_SCHEDULE_LEAD_MINUTES = 30;
const MAX_SCHEDULE_ADVANCE_DAYS = 7;

const pad = (n) => String(n).padStart(2, "0");

export const toDatetimeLocalValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;

export const scheduleMinDatetimeValue = () =>
  toDatetimeLocalValue(new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000));

export const scheduleMaxDatetimeValue = () =>
  toDatetimeLocalValue(new Date(Date.now() + MAX_SCHEDULE_ADVANCE_DAYS * 24 * 60 * 60 * 1000));

export const formatScheduledFor = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${day}/${month}`;
};
