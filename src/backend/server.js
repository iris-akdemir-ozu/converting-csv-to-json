const express = require("express")
const { MongoClient } = require("mongodb")
const bcrypt = require ('bcryptjs')
const cors = require('cors');
const app = express()

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(cors({
  origin: 'http://localhost:4200', // Allow requests from Angular app
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const jwt = require('jsonwebtoken');


const port = 3000
const JWT_SECRET = 'ca48f8c2c87e820934e5f3ed6f0961edab703b9a0b4c80af448fa83b7745955f'; // Change this to a secure secret
const MONGODB_URI = 'mongodb://localhost:27017/csvmanager'; // Adjust as needed
app.use(express.json())

const mongoUrl = "mongodb://localhost:27017"
const dbName = "csv_database" 
const collectionName = "csv_data" 

let db


MongoClient.connect(mongoUrl)
  .then((client) => {
    console.log("Connected to MongoDB")
    db = client.db(dbName)
  })
  .catch((error) => console.error("MongoDB connection error:", error))

// API endpoint to save CSV data
app.post("/api/csv-data", async (req, res) => {
  try {
    const csvData = req.body.data // Array of objects from your Angular app

    // Insert data (like INSERT INTO in MySQL)
    const result = await db.collection(collectionName).insertMany(csvData)

    res.json({
      success: true,
      message: `Inserted ${result.insertedCount} records`,
      insertedIds: result.insertedIds,
    })
  } catch (error) {
    console.error("Error inserting data:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// API endpoint to get all CSV data
app.get("/api/csv-data", async (req, res) => {
  try {
    // Find all documents (like SELECT * FROM table in MySQL)
    const data = await db.collection(collectionName).find({}).toArray()

    res.json({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error("Error fetching data:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// API endpoint to delete all data (for testing)
app.delete("/api/csv-data", async (req, res) => {
  try {
    // Delete all documents (like DELETE FROM table in MySQL)
    const result = await db.collection(collectionName).deleteMany({})

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} records`,
    })
  } catch (error) {
    console.error("Error deleting data:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})
// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: result.insertedId, username, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Profile endpoint (protected)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: req.user.userId },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
