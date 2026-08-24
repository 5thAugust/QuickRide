// Shared booking_id <-> Mongo rideId conversion. Used by both the Super App
// booking API (booking.controller.js) and the outbound status webhook
// (superappWebhook.service.js) so the ID we send back always matches the ID
// we handed out when the booking was created.
const BOOKING_PREFIX = "RIDE-";

function toBookingId(rideId) {
  return `${BOOKING_PREFIX}${rideId}`;
}

function toRideId(bookingId) {
  return bookingId.startsWith(BOOKING_PREFIX)
    ? bookingId.slice(BOOKING_PREFIX.length)
    : bookingId;
}

module.exports = { BOOKING_PREFIX, toBookingId, toRideId };
