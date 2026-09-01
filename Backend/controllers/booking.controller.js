const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const rideModel = require("../models/ride.model");
const rideService = require("../services/ride.service");
const userService = require("../services/user.service");
const mapService = require("../services/map.service");
const { sendMessageToSocketId } = require("../socket");
const superappWebhookService = require("../services/superappWebhook.service");
const { toBookingId, toRideId } = require("../utils/bookingId");

const STATUS_MAP = {
  pending: "searching",
  accepted: "accepted",
  ongoing: "ongoing",
  completed: "completed",
  cancelled: "cancelled",
};

function buildDriver(captain) {
  if (!captain) return null;
  return {
    name: `${captain.fullname.firstname} ${captain.fullname.lastname || ""}`.trim(),
    phone: captain.phone,
    plate: captain.vehicle?.number,
  };
}

function buildMessage(status, driver) {
  switch (status) {
    case "searching":
      return "Đang tìm tài xế phù hợp gần bạn...";
    case "accepted":
      return driver
        ? `Tài xế ${driver.name} đã nhận chuyến của bạn (biển số ${driver.plate}) và sẽ sớm liên hệ với bạn.`
        : "Tài xế đã nhận chuyến của bạn.";
    case "ongoing":
      return "Chuyến đi đang diễn ra.";
    case "completed":
      return "Chuyến đi đã hoàn tất. Cảm ơn bạn đã sử dụng QuickRide!";
    case "cancelled":
      return "Chuyến đi đã bị hủy.";
    default:
      return undefined;
  }
}

module.exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination, vehicle_type, customer, scheduled_for } = req.body;

  try {
    const user = await userService.findOrCreateByEmail({
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone_number,
      username: customer.username,
    });

    const ride = await rideService.createRide({
      user: user._id,
      pickup,
      destination,
      vehicleType: vehicle_type,
      scheduledFor: scheduled_for,
    });

    user.rides.push(ride._id);
    await user.save();

    res.status(201).json({
      booking_id: toBookingId(ride._id),
      status: "searching",
      message: buildMessage("searching"),
    });

    rideService.notifyNearbyCaptains({ ride, pickup, vehicleType: vehicle_type });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Không thể tạo chuyến đi." });
  }
};

module.exports.getBookingStatus = async (req, res) => {
  const rawBookingId = req.query.booking_id;
  if (!rawBookingId) {
    return res.status(400).json({ message: "booking_id is required" });
  }

  const rideId = toRideId(rawBookingId);
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return res.status(400).json({ message: "Invalid booking_id" });
  }

  try {
    const ride = await rideModel
      .findOne({ _id: rideId })
      .populate("captain", "fullname phone vehicle");

    if (!ride) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const status = STATUS_MAP[ride.status] || ride.status;
    const driver = buildDriver(ride.captain);

    return res.status(200).json({
      booking_id: rawBookingId,
      status,
      fare: ride.fare,
      driver,
      message: buildMessage(status, driver),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.cancelBooking = async (req, res) => {
  const rawBookingId = req.body?.booking_id;
  if (!rawBookingId) {
    return res.status(400).json({ message: "booking_id is required" });
  }

  const rideId = toRideId(rawBookingId);
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return res.status(400).json({ message: "Invalid booking_id" });
  }

  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

  try {
    const ride = await rideService.cancelRide({ rideId });

    // Same captain-facing cleanup as the in-app cancel flow (ride.controller.js):
    // anyone still looking at this ride's "new ride" popup needs to know it's gone.
    const pickupCoordinates = await mapService.getAddressCoordinate(ride.pickup);
    const captainsInRadius = await mapService.getCaptainsInTheRadius(
      pickupCoordinates.ltd,
      pickupCoordinates.lng,
      mapService.DEFAULT_SEARCH_RADIUS_KM,
      ride.vehicle
    );
    captainsInRadius.forEach((captain) => {
      sendMessageToSocketId(captain.socketId, { event: "ride-cancelled", data: ride });
    });

    superappWebhookService.notifyRideStatus({
      rideId: ride._id,
      status: "CANCELLED",
      captain: ride.captain,
      message: reason ? `Chuyến đi đã bị hủy. Lý do: ${reason}` : undefined,
    });

    return res.status(200).json({
      booking_id: rawBookingId,
      status: "cancelled",
      message: reason ? `Chuyến đi đã bị hủy. Lý do: ${reason}` : buildMessage("cancelled"),
    });
  } catch (err) {
    console.error(err);
    if (err.message === "Ride not found") {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (err.message.startsWith("Cannot cancel")) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
