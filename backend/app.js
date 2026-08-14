const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const hospitalRoutes = require("./routes/hospitalRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");
const authRoutes = require("./routes/authRoutes");
const policeDepartmentRoutes =
  require("./routes/policeDepartmentRoutes");
const gpsRoutes = require("./routes/gpsRoutes");
const path = require("path");



const vehicleRoutes = require("./routes/vehicleRoutes");
const studentRoutes = require("./routes/studentRoutes");
const roadIncidentRoutes = require("./routes/roadIncidentRoutes");
const userRoutes = require("./routes/userRoutes");
const sosRoutes = require("./routes/sosRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rideRoutes = require("./routes/rideRoutes");
const placeRoutes = require("./routes/placeRoutes");
const activityRoutes = require("./routes/activityRoutes");
const savedAddressRoutes = require("./routes/savedAddressRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const walletRoutes = require("./routes/walletRoutes");
const app = express();
app.locals.trackedVehicles = [];

// CORS configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Serve static files with proper headers
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));

app.use(express.json());
app.use("/api/sos", sosRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/road-incidents", roadIncidentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/police", policeDepartmentRoutes);
app.use("/api/police-departments", policeDepartmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/ride-driver", rideRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/saved-addresses", savedAddressRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", walletRoutes);
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.use("/api/students", studentRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/gps", gpsRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/ambulance-trips", ambulanceRoutes);

app.get("/", (req, res) => {
  res.send("SafeZone Backend Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});