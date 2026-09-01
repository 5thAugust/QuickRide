const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const bookingController = require("../controllers/booking.controller");
const { authSuperApp } = require("../middlewares/auth.middleware");
const { validateScheduledFor } = require("../utils/scheduleValidation");

// Server-to-server contract for a Super App: no cookies/JWT session, no
// signup screen — the caller has already authenticated the end user and
// attaches `customer` on every mutating call. See booking.controller.js.

router.post(
  "/",
  authSuperApp,
  body("pickup").isString().isLength({ min: 3 }).withMessage("Invalid pickup address"),
  body("destination").isString().isLength({ min: 3 }).withMessage("Invalid destination address"),
  body("vehicle_type").isString().isIn(["car", "bike"]).withMessage("Invalid vehicle_type"),
  body("customer.email").isEmail().withMessage("Invalid customer.email"),
  body("customer.username").isString().notEmpty().withMessage("customer.username is required"),
  body("scheduled_for").optional({ nullable: true }).isISO8601().withMessage("Invalid scheduled_for datetime")
    .custom(validateScheduledFor),
  bookingController.createBooking
);

// Read-only status check — GET only, no `customer` in the request.
router.get("/status", authSuperApp, bookingController.getBookingStatus);

// Cancel a ride the Super App booked, while it's still pending/accepted
// (not once a captain has already started or completed it). booking_id is
// in the JSON body, not a URL path param — the Gateway calling us only
// ever sends a static registered path (see GatewayService.invoke_endpoint,
// which never interpolates {placeholders}), so every other mutating
// endpoint here (createBooking included) takes its identifiers this way
// too. `reason` is optional free text, validated inline in the controller.
router.post("/cancel", authSuperApp, bookingController.cancelBooking);

module.exports = router;
