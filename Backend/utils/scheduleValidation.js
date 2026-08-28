// Shared bounds for "đặt xe theo giờ" (schedule a future pickup time),
// used by both the in-app ride API (ride.routes.js) and the Super App
// booking API (booking.routes.js) so the two entry points stay consistent.
const MIN_SCHEDULE_LEAD_MINUTES = Number(process.env.SCHEDULE_MIN_LEAD_MINUTES) || 30;
const MAX_SCHEDULE_ADVANCE_DAYS = Number(process.env.SCHEDULE_MAX_ADVANCE_DAYS) || 7;

function validateScheduledFor(value) {
  if (value === undefined || value === null || value === "") return true;

  const scheduledFor = new Date(value);
  if (Number.isNaN(scheduledFor.getTime())) {
    throw new Error("Invalid scheduledFor datetime");
  }

  const minTime = Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000;
  const maxTime = Date.now() + MAX_SCHEDULE_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

  if (scheduledFor.getTime() < minTime) {
    throw new Error(`scheduledFor must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now`);
  }
  if (scheduledFor.getTime() > maxTime) {
    throw new Error(`scheduledFor must be within ${MAX_SCHEDULE_ADVANCE_DAYS} days from now`);
  }

  return true;
}

module.exports = {
  MIN_SCHEDULE_LEAD_MINUTES,
  MAX_SCHEDULE_ADVANCE_DAYS,
  validateScheduledFor,
};
