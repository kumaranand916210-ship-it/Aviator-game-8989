const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// ================= CONFIG =================
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!JWT_SECRET || !MONGO_URI) {
  console.error("❌ Missing ENV variables");
  process.exit(1);
}

// ================= APP =================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send("Aviator API running 🚀");
});

// ================= DB =================
mongoose.connect(MONGO_URI)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log(err));

// ================= MODEL =================
const User = mongoose.model('User', new mongoose.Schema({
  phone: { type: String, unique: true },
  password: String,
  balance: { type: Number, default: 0 }
}));

// ================= AUTH =================
app.post('/register', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res.status(400).json({ message: "Fill all fields" });

    const exist = await User.findOne({ phone });
    if (exist)
      return res.json({ message: "Already registered" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hash
    });

    res.json({ message: "Registered successfully" });

  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ message: "Wrong password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET);

    res.json({
      token,
      user: {
        balance: user.balance
      }
    });

  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
});

// ================= START =================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});