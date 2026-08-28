// Shared helpers for "đặt xe theo giờ" (schedule a future pickup time).
// Values are kept as <input type="datetime-local"> strings (local time, no
// timezone suffix) end-to-end in the UI, and only converted to an ISO
// string right before hitting the API — matches the min/max window
// enforced server-side in Backend/utils/scheduleValidation.js.
// Must match Backend/utils/scheduleValidation.js's MIN_SCHEDULE_LEAD_MINUTES.
export const MIN_SCHEDULE_LEAD_MINUTES = 30;
// Extra slack on top of the server's floor so the time it takes to fill in
// pickup/destination, wait for the fare quote, and step through the panels
// (plus normal network latency) doesn't let the picked time slip below
// MIN_SCHEDULE_LEAD_MINUTES by the time the request actually reaches the
// server — the server re-checks against its own clock at request time, not
// against whatever "now" was when this default was computed.
const CLIENT_LEAD_BUFFER_MINUTES = 10;
const MAX_SCHEDULE_ADVANCE_DAYS = 7;

const pad = (n) => String(n).padStart(2, "0");

export const toDatetimeLocalValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;

export const scheduleMinDatetimeValue = () =>
  toDatetimeLocalValue(
    new Date(Date.now() + (MIN_SCHEDULE_LEAD_MINUTES + CLIENT_LEAD_BUFFER_MINUTES) * 60 * 1000)
  );

export const scheduleMaxDatetimeValue = () =>
  toDatetimeLocalValue(new Date(Date.now() + MAX_SCHEDULE_ADVANCE_DAYS * 24 * 60 * 60 * 1000));

export const formatScheduledFor = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${day}/${month}`;
};
