const mongoose = require("mongoose");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;