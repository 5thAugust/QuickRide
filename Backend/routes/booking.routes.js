const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const bookingController = require("../controllers/booking.controller");
const { authSuperApp } = require("../middlewares/auth.middleware");

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
  bookingController.createBooking
);

// Read-only status check — GET only, no `customer` in the request.
router.get("/status", authSuperApp, bookingController.getBookingStatus);

module.exports = router;
