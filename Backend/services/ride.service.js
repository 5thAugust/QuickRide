const captainModel = require("../models/captain.model");
const rideModel = require("../models/ride.model");
const mapService = require("./map.service");
const { sendMessageToSocketId } = require("../socket");

// How long before a scheduled ride's pickup time to nudge the captain who
// already accepted it that it's almost time to head over.
const SCHEDULE_REMINDER_LEAD_MINUTES = Number(process.env.SCHEDULE_REMINDER_LEAD_MINUTES) || 10;

const getFare = async (pickup, destination) => {
  if (!pickup || !destination) {
    throw new Error("Pickup and destination are required");
  }

  const distanceTime = await mapService.getDistanceTime(pickup, destination);

  const baseFare = {
    car: 15000,
    bike: 10000,
  };

  const perKmRate = {
    car: 12000,
    bike: 5000,
  };

  const perMinuteRate = {
    car: 500,
    bike: 200,
  };

  const fare = {
    car: Math.round(
      baseFare.car +
        (distanceTime.distance.value / 1000) * perKmRate.car +
        (distanceTime.duration.value / 60) * perMinuteRate.car
    ),
    bike: Math.round(
      baseFare.bike +
        (distanceTime.distance.value / 1000) * perKmRate.bike +
        (distanceTime.duration.value / 60) * perMinuteRate.bike
    ),
  };

  return { fare, distanceTime };
};

module.exports.getFare = getFare;

module.exports.createRide = async ({
  user,
  pickup,
  destination,
  vehicleType,
  scheduledFor,
}) => {
  if (!user || !pickup || !destination || !vehicleType) {
    throw new Error("All fields are required");
  }

  try {
    const { fare, distanceTime } = await getFare(pickup, destination);

    const ride = rideModel.create({
      user,
      pickup,
      destination,
      fare: fare[vehicleType],
      vehicle: vehicleType,
      distance: distanceTime.distance.value,
      duration: distanceTime.duration.value,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    });

    return ride;
  } catch (error) {
    throw new Error("Error occured while creating ride.");
  }
};

// Polled periodically (see server.js) to notify the captain who already
// accepted a scheduled ride ("đặt xe theo giờ") that it's almost time to
// start — scheduledFor by itself is just a label shown in the UI; this is
// what actually prompts the captain to act on it, once per ride
// (scheduledReminderSentAt guards against re-sending on every poll tick).
module.exports.sendScheduledStartReminders = async () => {
  const reminderThreshold = new Date(Date.now() + SCHEDULE_REMINDER_LEAD_MINUTES * 60 * 1000);

  try {
    const dueRides = await rideModel
      .find({
        status: "accepted",
        scheduledFor: { $ne: null, $lte: reminderThreshold },
        scheduledReminderSentAt: null,
      })
      .populate("captain")
      .populate("user");

    for (const ride of dueRides) {
      if (ride.captain?.socketId) {
        sendMessageToSocketId(ride.captain.socketId, {
          event: "ride-start-reminder",
          data: ride,
        });
      }
      await rideModel.findOneAndUpdate(
        { _id: ride._id },
        { scheduledReminderSentAt: new Date() }
      );
    }
  } catch (e) {
    console.error("Failed to send scheduled ride start reminders:", e.message);
  }
};

// Fire-and-forget: finds nearby captains for a freshly created ride and pings
// them over the socket. Shared by the in-app ride flow and the Super App
// booking flow so both notify captains the same way.
module.exports.notifyNearbyCaptains = async ({ ride, pickup, vehicleType }) => {
  try {
    const pickupCoordinates = await mapService.getAddressCoordinate(pickup);

    // TEMP DEBUG — remove once "captain doesn't get notified" is confirmed
    // fixed. Shows exactly where matching fails: bad geocoding, no captain
    // of that vehicle type, everyone too far away, or a captain in range
    // with no live socketId.
    const captainsOfType = await captainModel.find(
      { "vehicle.type": vehicleType },
      "fullname socketId location vehicle.type"
    );
    console.log(
      `[notifyNearbyCaptains] ride=${ride._id} pickup="${pickup}" -> resolved coords:`,
      pickupCoordinates
    );
    console.log(
      `[notifyNearbyCaptains] ${captainsOfType.length} captain(s) registered with vehicle.type="${vehicleType}"`
    );
    captainsOfType.forEach((c) => {
      const coords = c.location?.coordinates;
      const distanceKm = coords
        ? (
            mapService.haversineDistanceMeters(pickupCoordinates, {
              ltd: coords[1],
              lng: coords[0],
            }) / 1000
          ).toFixed(2) + "km"
        : "no location set";
      console.log(
        `  - captain ${c._id} (${c.fullname?.firstname}): socketId=${c.socketId || "NONE"}, distance=${distanceKm}`
      );
    });

    const captainsInRadius = await mapService.getCaptainsInTheRadius(
      pickupCoordinates.ltd,
      pickupCoordinates.lng,
      mapService.DEFAULT_SEARCH_RADIUS_KM,
      vehicleType
    );
    console.log(
      `[notifyNearbyCaptains] ${captainsInRadius.length} captain(s) matched within ${mapService.DEFAULT_SEARCH_RADIUS_KM}km radius`
    );

    const rideWithUser = await rideModel
      .findOne({ _id: ride._id })
      .populate("user");

    captainsInRadius.forEach((captain) => {
      sendMessageToSocketId(captain.socketId, {
        event: "new-ride",
        data: rideWithUser,
      });
    });
  } catch (e) {
    console.error("Background captain-matching task failed:", e.message);
  }
};

// when ride request is accepted by captain
module.exports.confirmRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  try {
    await rideModel.findOneAndUpdate(
      {
        _id: rideId,
      },
      {
        status: "accepted",
        captain: captain._id,
      }
    );

    const captainData = await captainModel.findOne({ _id: captain._id });

    captainData.rides.push(rideId);

    await captainData.save();

    const ride = await rideModel
      .findOne({
        _id: rideId,
      })
      .populate("user")
      .populate("captain");

    if (!ride) {
      throw new Error("Ride not found");
    }

    return ride;
  } catch (error) {
    console.log(error)
    throw new Error("Error occured while confirming ride.");
  }
};

module.exports.startRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
    })
    .populate("user")
    .populate("captain");

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.status !== "accepted") {
    throw new Error("Ride not accepted");
  }

  await rideModel.findOneAndUpdate(
    {
      _id: rideId,
    },
    {
      status: "ongoing",
    }
  );

  return ride;
};

module.exports.endRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
      captain: captain._id,
    })
    .populate("user")
    .populate("captain");

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.status !== "ongoing") {
    throw new Error("Ride not ongoing");
  }

  await rideModel.findOneAndUpdate(
    {
      _id: rideId,
    },
    {
      status: "completed",
    }
  );

  return ride;
};
