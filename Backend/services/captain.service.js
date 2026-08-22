const captainModel = require("../models/captain.model");

module.exports.createCaptain = async (
  firstname,
  lastname,
  email,
  password,
  phone,
  color,
  number,
  capacity,
  type
) => {
  if (!firstname || !email || !password) {
    throw new Error("All fields are required");
  }

  const hashedPassword = await captainModel.hashPassword(password);

  const captain = await captainModel.create({
    fullname: {
      firstname,
      lastname,
    },
    email,
    password: hashedPassword,
    phone,
    vehicle: {
      color,
      number,
      capacity,
      type,
    },
    // location.coordinates is a required GeoJSON field (needed for the
    // $geoWithin/$centerSphere radius search in map.service.js), but nothing
    // collects a real GPS fix at signup time. Seed a placeholder — Hanoi
    // Hoan Kiem Lake, matching map.service.js's MOCK_CENTER — so
    // registration doesn't fail validation. CaptainHomeScreen.jsx overwrites
    // this with the captain's real position via the "update-location-captain"
    // socket event as soon as they open the app and grant geolocation.
    location: {
      type: "Point",
      coordinates: [105.8542, 21.0285],
    },
  });

  return captain;
};
