const axios = require("axios");
const crypto = require("crypto");
const { toBookingId } = require("../utils/bookingId");

const WEBHOOK_TIMEOUT_MS = 5000;
const WEBHOOK_PATH = "/api/v1/webhooks/ride-status";

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

// Recursively sorts object keys so our canonical JSON matches the Super
// App's verifier byte-for-byte, mirroring Python's json.dumps(sort_keys=True).
// JSON.stringify already omits whitespace and leaves non-ASCII untouched,
// matching separators=(",", ":") and ensure_ascii=False on the Python side.
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = canonicalize(value[key]);
    }
    return sorted;
  }
  return value;
}

function canonicalJSON(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function hmacSha256Hex(key, text) {
  return crypto.createHmac("sha256", key).update(text, "utf8").digest("hex");
}

// Fire-and-forget: notifies the Super App whenever a ride's status changes
// (driver accepted, started, completed, cancelled...). Never awaited by
// callers and never throws — a slow/failing webhook must not delay or fail
// the captain/user action that triggered it. Failures are only logged.
//
// Every request is signed per the Super App's webhook auth contract: an
// HMAC-SHA256 over {app_id, key_id, method, path, timestamp, nonce,
// body_sha256} keyed by SUPERAPP_API_KEY, plus a fresh nonce/timestamp per
// call so a captured request can't be replayed.
module.exports.notifyRideStatus = ({ rideId, status, captain, message }) => {
  const url = (process.env.SUPERAPP_WEBHOOK_URL || "").trim();
  const appId = (process.env.SUPERAPP_APP_ID || "").trim();
  const keyId = (process.env.SUPERAPP_KEY_ID || "").trim();
  const apiKey = (process.env.SUPERAPP_API_KEY || "").trim();
  const serviceCode = (process.env.SUPERAPP_SERVICE_CODE || "").trim();
  const miniappOrigin = (process.env.SERVER_URL || "").trim();

  if (!url || !appId || !keyId || !apiKey || !serviceCode || !miniappOrigin) {
    console.warn(
      `[superapp-webhook] SUPERAPP_WEBHOOK_URL/SUPERAPP_APP_ID/SUPERAPP_KEY_ID/SUPERAPP_API_KEY/SUPERAPP_SERVICE_CODE/SERVER_URL not configured — skipping notify for ride=${rideId} status=${status}`
    );
    return;
  }

  const body = {
    service_code: serviceCode,
    booking_id: toBookingId(rideId),
    status,
    ...buildDriverFields(captain),
    ...(message ? { message } : {}),
  };

  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const bodySha256 = sha256Hex(canonicalJSON(body));
  const signedPayload = {
    app_id: appId,
    key_id: keyId,
    method: "POST",
    path: WEBHOOK_PATH,
    timestamp,
    nonce,
    body_sha256: bodySha256,
  };
  const signature = hmacSha256Hex(apiKey, canonicalJSON(signedPayload));

  axios
    .post(url, body, {
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": appId,
        "X-Key-Id": keyId,
        "X-Api-Key": apiKey,
        "X-Miniapp-Origin": miniappOrigin,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
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
