const axios = require("axios");
const captainModel = require("../models/captain.model");

// Hanoi Hoan Kiem Lake, used as a last-resort fallback center when the free
// geocoder can't resolve an address and no Google Maps API key is configured
const MOCK_CENTER = { ltd: 21.0285, lng: 105.8542 };

// Free, no-API-key geocoder (OpenStreetMap Nominatim) used as a stand-in for
// Google Geocoding when GOOGLE_MAPS_API isn't configured, so mocked pickup/
// destination coordinates actually reflect the address typed by the user
// instead of a random point (which broke nearby-captain matching).
// Rough Hanoi bounding box (west,north,east,south) — biases short/ambiguous
// place names (e.g. "xuân thủy" alone) toward Hanoi instead of a same-named
// location elsewhere in Vietnam
const HANOI_VIEWBOX = "105.5,21.3,106.1,20.85";

// Nominatim's free-text search often can't resolve a full Vietnamese street
// address with house number/alley ("số 12, ngõ 75, phố ...") and returns no
// results at all, even though the underlying street is well known. Strip
// that prefix and retry with just the street/area name before giving up.
// Tokenized by whitespace rather than \b regex boundaries — Vietnamese
// diacritics (ố, ẫ, ệ...) aren't in JS's ASCII-only \w, so \b silently fails
// to match around them.
const ADDRESS_NOISE_WORDS = new Set(["số", "nhà", "ngõ", "hẻm", "ngách"]);

function simplifyVietnameseAddress(address) {
  const words = address.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  const kept = [];

  for (let i = 0; i < words.length; i++) {
    if (ADDRESS_NOISE_WORDS.has(words[i].toLowerCase())) {
      if (words[i + 1] && /^\d+\w*$/.test(words[i + 1])) {
        i++; // also drop the house/alley number right after it
      }
      continue;
    }
    kept.push(words[i]);
  }

  return kept.join(" ").trim();
}

async function queryNominatim(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
    `&countrycodes=vn&viewbox=${HANOI_VIEWBOX}&bounded=1` +
    `&q=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    headers: { "User-Agent": "QuickRide-Dev/1.0 (local testing)" },
    timeout: 5000,
  });
  const result = response.data?.[0];
  return result ? { ltd: parseFloat(result.lat), lng: parseFloat(result.lon) } : null;
}

async function geocodeWithNominatim(address) {
  const direct = await queryNominatim(address);
  if (direct) return direct;

  const simplified = simplifyVietnameseAddress(address);
  if (simplified && simplified !== address) {
    const fallback = await queryNominatim(simplified);
    if (fallback) return fallback;
  }

  throw new Error("No geocoding results");
}

module.exports.haversineDistanceMeters = haversineDistanceMeters;

function haversineDistanceMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.ltd - a.ltd);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.ltd);
  const lat2 = toRad(b.ltd);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

module.exports.getAddressCoordinate = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API;

  if (!apiKey) {
    try {
      const coords = await geocodeWithNominatim(address);
      console.warn(
        "[map.service] GOOGLE_MAPS_API not set — geocoded via Nominatim:",
        address,
        coords
      );
      return coords;
    } catch (err) {
      console.warn(
        "[map.service] Nominatim geocoding failed, falling back to mock center for:",
        address,
        err.message
      );
      return {
        ltd: MOCK_CENTER.ltd + (Math.random() - 0.5) * 0.02,
        lng: MOCK_CENTER.lng + (Math.random() - 0.5) * 0.02,
      };
    }
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
    try {
      const [originCoords, destCoords] = await Promise.all([
        geocodeWithNominatim(origin),
        geocodeWithNominatim(destination),
      ]);
      const straightLineMeters = haversineDistanceMeters(originCoords, destCoords);
      // roads are never a straight line — pad by ~35% to approximate real route distance
      const distanceMeters = Math.round(straightLineMeters * 1.35);
      const avgSpeedKmh = 25; // rough average city driving speed
      const durationSeconds = Math.round((distanceMeters / 1000 / avgSpeedKmh) * 3600);
      console.warn(
        "[map.service] GOOGLE_MAPS_API not set — estimated distance/time via Nominatim:",
        origin,
        "->",
        destination
      );
      return {
        distance: {
          value: distanceMeters,
          text: `${(distanceMeters / 1000).toFixed(1)} km`,
        },
        duration: {
          value: durationSeconds,
          text: `${Math.round(durationSeconds / 60)} mins`,
        },
      };
    } catch (err) {
      console.warn(
        "[map.service] Nominatim estimate failed, falling back to random mock:",
        err.message
      );
      const distanceKm = Math.round((2 + Math.random() * 13) * 10) / 10; // 2–15 km
      const durationMin = Math.round(distanceKm * (2 + Math.random() * 1.5)); // ~2-3.5 min/km
      return {
        distance: { value: Math.round(distanceKm * 1000), text: `${distanceKm} km` },
        duration: { value: durationMin * 60, text: `${durationMin} mins` },
      };
    }
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

// Free Nominatim geocoding can land a few km off the real address (wrong
// same-named place, or house-number/alley details it can't resolve
// precisely) — a wider radius than a "true" 4km absorbs that noise without
// needing a paid geocoding API.
module.exports.DEFAULT_SEARCH_RADIUS_KM = 7;

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
