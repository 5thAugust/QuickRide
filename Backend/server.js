require("dotenv").config();
const socket = require("./socket");
const express = require("express");
const { createServer } = require("http");
const app = express();
const server = createServer(app);

socket.initializeSocket(server);

const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const userRoutes = require("./routes/user.routes");
const captainRoutes = require("./routes/captain.routes");
const mapsRoutes = require("./routes/maps.routes");
const rideRoutes = require("./routes/ride.routes");
const mailRoutes = require("./routes/mail.routes");
const bookingRoutes = require("./routes/booking.routes");
const dbStream = require("./services/logging.service");
const rideService = require("./services/ride.service");
require("./config/db");
const PORT = process.env.PORT || 4000;

// Periodically move rides booked for later ("đặt xe theo giờ") into the
// normal dispatch flow once they're close to their scheduled pickup time.
const SCHEDULE_POLL_INTERVAL_MS = Number(process.env.SCHEDULE_POLL_INTERVAL_MS) || 60000;
setInterval(() => rideService.activateScheduledRides(), SCHEDULE_POLL_INTERVAL_MS);

if (process.env.ENVIRONMENT == "production") {
  app.use(
    morgan(":method :url :status :response-time ms - :res[content-length]", {
      stream: dbStream,
    })
  );
} else {
  app.use(morgan("dev"));
}
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json("Hello, World!");
});

app.get("/reload", (req, res) => {
  res.json("Server Reloaded");
});

app.use("/user", userRoutes);
app.use("/captain", captainRoutes);
app.use("/map", mapsRoutes);
app.use("/ride", rideRoutes);
app.use("/mail", mailRoutes);
app.use("/bookings", bookingRoutes);

server.listen(PORT, () => {
  console.log("Server is listening on port", PORT);

  // TEMP DEBUG — remove once the Super App x-api-key integration is confirmed
  // working. Never logs the full key, only enough to spot a bad/missing value.
  const key = process.env.SUPERAPP_API_KEY;
  if (key) {
    console.log(
      `[SUPERAPP_API_KEY] loaded: length=${key.length}, starts="${key.slice(0, 4)}", ends="${key.slice(-4)}", hasWhitespace=${key !== key.trim()}`
    );
  } else {
    console.log("[SUPERAPP_API_KEY] NOT SET — process.env.SUPERAPP_API_KEY is undefined");
  }
});
