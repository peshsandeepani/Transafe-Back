/**
 * Test script to setup police department and admin
 * 
 * Usage:
 * 1. Make sure backend is running on http://localhost:5000
 * 2. Run: node testPoliceSetup.js
 */

const http = require("http");

// Test 1: Create new police department with admin
function createPoliceDepartment() {
  const data = JSON.stringify({
    stationName: "Main Police Station",
    stationCode: "PS001",
    division: "City Division",
    address: "123 Main Street",
    phone: "+94 11 234 5678",
    emergencyNumber: "119",
    officerInCharge: "Inspector Silva",
    email: "mainpolice@station.lk",
    latitude: 6.9271,
    longitude: 80.7789,
    district: "Colombo",
    province: "Western",
    adminName: "Police Admin",
    adminEmail: "police@test.com",
    adminPassword: "123456",
  });

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/police",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = http.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", JSON.parse(body));
      
      // Extract credentials
      if (res.statusCode === 201 || res.statusCode === 200) {
        const response = JSON.parse(body);
        console.log("\n✅ Police Department Setup Successful!");
        console.log("\n📋 New Credentials:");
        console.log("Email:", response.policeAdmin.email);
        console.log("Password: 123456");
        console.log("Department ID:", response.policeDepartment.id);
      }
    });
  });

  req.on("error", (error) => {
    console.error("Error:", error.message);
  });

  req.write(data);
  req.end();
}

console.log("🚔 Setting up Police Department...\n");
createPoliceDepartment();
