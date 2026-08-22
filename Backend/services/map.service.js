const axios = require("axios");
const captainModel = require("../models/captain.model");

// Hanoi Hoan Kiem Lake, used to center mocked coordinates when no API key is configured
const MOCK_CENTER = { ltd: 21.0285, lng: 105.8542 };

module.exports.getAddressCoordinate = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API;

  if (!apiKey) {
    console.warn(
      "[map.service] GOOGLE_MAPS_API not set — returning mocked coordinates for:",
      address
    );
    return {
      ltd: MOCK_CENTER.ltd + (Math.random() - 0.5) * 0.05,
      lng: MOCK_CENTER.lng + (Math.random() - 0.5) * 0.05,
    };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      const location = response.data.results[0].geometry.location;
      return {
        ltd: location.lat,
        lng: location.lng,
      };
    } else {
      throw new Error("Unable to fetch coordinates");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports.getDistanceTime = async (origin, destination) => {
  if (!origin || !destination) {
    throw new Error("Origin and destination are required");
  }
  const apiKey = process.env.GOOGLE_MAPS_API;

  if (!apiKey) {
    console.warn(
      "[map.service] GOOGLE_MAPS_API not set — returning mocked distance/time for:",
      origin,
      "->",
      destination
    );
    const distanceKm = Math.round((2 + Math.random() * 13) * 10) / 10; // 2–15 km
    const durationMin = Math.round(distanceKm * (2 + Math.random() * 1.5)); // ~2-3.5 min/km
    return {
      distance: { value: Math.round(distanceKm * 1000), text: `${distanceKm} km` },
      duration: { value: durationMin * 60, text: `${durationMin} mins` },
    };
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    origin
  )}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      if (response.data.rows[0].elements[0].status === "ZERO_RESULTS") {
        throw new Error("No routes found");
      }

      return response.data.rows[0].elements[0];
    } else {
      throw new Error("Unable to fetch distance and time");
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports.getAutoCompleteSuggestions = async (input) => {
  if (!input) {
    throw new Error("query is required");
  }

  const apiKey = process.env.GOOGLE_MAPS_API;

  if (!apiKey) {
    console.warn(
      "[map.service] GOOGLE_MAPS_API not set — returning mocked suggestions for:",
      input
    );
    return [
      `${input}, Hoan Kiem, Ha Noi`,
      `${input}, Ba Dinh, Ha Noi`,
      `${input}, Dong Da, Ha Noi`,
    ];
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    input
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      return response.data.predictions
        .map((prediction) => prediction.description)
        .filter((value) => value);
    } else {
      throw new Error("Unable to fetch suggestions");
    }
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius, vehicleType) => {
  // radius in km
  
  try {
    const captains = await captainModel.find({
      location: {
        $geoWithin: {
          $centerSphere: [[lng, ltd], radius / 6371],
        },
      },
      "vehicle.type": vehicleType,
    });
    return captains;
  } catch (error) {
    throw new Error("Error in getting captain in radius: " + error.message);
  }
};
