const axios = require("axios");
const { toBookingId } = require("../utils/bookingId");

const WEBHOOK_TIMEOUT_MS = 5000;

function buildDriverFields(captain) {
  if (!captain) return {};

  const firstname = captain.fullname?.firstname || "";
  const lastname = captain.fullname?.lastname || "";
  const driverName = `${firstname} ${lastname}`.trim();

  const fields = {};
  if (driverName) fields.driver_name = driverName;
  if (captain.phone) fields.driver_phone = captain.phone;
  if (captain.vehicle?.number) fields.license_plate = captain.vehicle.number;
  return fields;
}

// Fire-and-forget: notifies the Super App whenever a ride's status changes
// (driver accepted, started, completed, cancelled...). Never awaited by
// callers and never throws — a slow/failing webhook must not delay or fail
// the captain/user action that triggered it. Failures are only logged.
//
// Auth reuses SUPERAPP_API_KEY — the same Outbound API Key issued when this
// mini app registered with the Super App, which already authenticates the
// Super App's inbound calls to us (see authSuperApp in auth.middleware.js).
// There is no separate outbound secret.
module.exports.notifyRideStatus = ({ rideId, status, captain, message }) => {
  const url = (process.env.SUPERAPP_WEBHOOK_URL || "").trim();
  const apiKey = (process.env.SUPERAPP_API_KEY || "").trim();
  const serviceCode = (process.env.SUPERAPP_SERVICE_CODE || "").trim();

  if (!url || !apiKey || !serviceCode) {
    console.warn(
      `[superapp-webhook] SUPERAPP_WEBHOOK_URL/SUPERAPP_API_KEY/SUPERAPP_SERVICE_CODE not configured — skipping notify for ride=${rideId} status=${status}`
    );
    return;
  }

  const payload = {
    service_code: serviceCode,
    booking_id: toBookingId(rideId),
    status,
    ...buildDriverFields(captain),
    ...(message ? { message } : {}),
  };

  axios
    .post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      timeout: WEBHOOK_TIMEOUT_MS,
    })
    .then((res) => {
      console.log(
        `[superapp-webhook] delivered ride=${rideId} status=${status} ->`,
        res.data
      );
    })
    .catch((err) => {
      const detail = err.response
        ? `HTTP ${err.response.status} ${JSON.stringify(err.response.data)}`
        : err.message;
      console.error(
        `[superapp-webhook] failed to notify ride=${rideId} status=${status}: ${detail}`
      );
    });
};
