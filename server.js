const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// File paths for persistent storage
const FARMERS_FILE = path.join(__dirname, 'data', 'farmers.json');
const BUYERS_FILE = path.join(__dirname, 'data', 'buyers.json');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load data from files or initialize empty objects
let farmers = {};
let buyers = {};

function loadFarmersData() {
  try {
    if (fs.existsSync(FARMERS_FILE)) {
      const data = fs.readFileSync(FARMERS_FILE, 'utf8');
      farmers = JSON.parse(data);
      console.log(`✅ Loaded ${Object.keys(farmers).length} farmers from storage`);
    }
  } catch (error) {
    console.error('Error loading farmers:', error);
    farmers = {};
  }
}

function loadBuyersData() {
  try {
    if (fs.existsSync(BUYERS_FILE)) {
      const data = fs.readFileSync(BUYERS_FILE, 'utf8');
      buyers = JSON.parse(data);
      console.log(`✅ Loaded ${Object.keys(buyers).length} buyers from storage`);
    }
  } catch (error) {
    console.error('Error loading buyers:', error);
    buyers = {};
  }
}

function saveFarmersData() {
  try {
    fs.writeFileSync(FARMERS_FILE, JSON.stringify(farmers, null, 2));
  } catch (error) {
    console.error('Error saving farmers:', error);
  }
}

function saveBuyersData() {
  try {
    fs.writeFileSync(BUYERS_FILE, JSON.stringify(buyers, null, 2));
  } catch (error) {
    console.error('Error saving buyers:', error);
  }
}

// Load existing data on startup
loadFarmersData();
loadBuyersData();

// Normalize phone to +91XXXXXXXXXX format
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  }
  return '+91' + cleaned.slice(-10);
}

function genUid(role, phone) {
  // Generate shorter unique ID: ROLE-RANDOM
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${role}-${randomPart}`;
}

function generateDelivererDetails(count) {
  const firstNames = ['Ravi', 'Muthu', 'Suresh', 'Arun', 'Vikram', 'Harish', 'Kumar', 'Rajesh', 'Bhuvan', 'Sachin'];
  const lastNames = ['Kumar', 'Singh', 'Patel', 'Sharma', 'Raj', 'Babu', 'Rao', 'Nair', 'Dey', 'Malik'];
  const vehicles = ['🏍️ Motorcycle', '🛵 Auto', '🚛 Truck', '🛒 Cart', '🚴 Bicycle'];
  const fuels = ['⛽ Petrol', '⛽ Diesel', '🔋 Electric'];
  
  const deliverers = [];
  for (let i = 0; i < count; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const vehicleType = vehicles[Math.floor(Math.random() * vehicles.length)];
    const fuel = fuels[Math.floor(Math.random() * fuels.length)];
    const tnNumber = `TN${Math.floor(Math.random() * 90) + 10} ${vehicleType.includes('Truck') ? 'AB' : 'CD'} ${Math.floor(Math.random() * 9000) + 1000}`;
    
    deliverers.push({
      id: `DEL-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      name: `${first} ${last}`,
      phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      vehicle: vehicleType,
      fuel: fuel,
      tnNumber: tnNumber,
      status: Math.random() > 0.3 ? '🟢 Online' : '🔴 Offline',
      rating: (Math.random() * 1 + 4).toFixed(1)
    });
  }
  return deliverers;
}

app.post('/api/farmer/register', (req, res) => {
  const { name, phone, village } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Missing name or phone' });
  }
  if (farmers[phone]) {
    return res.status(409).json({ error: 'Farmer already exists' });
  }
  const uid = genUid('FARM', phone);
  farmers[phone] = {
    uid,
    name,
    phone,
    village: village || 'Coimbatore',
    mainCrop: 'Coconut',
    farmSize: '2',
    totalEarnings: 0,
    ordersToday: 0,
    rating: '4.9',
    joined: new Date().toISOString(),
    onboardingComplete: false
  };
  return res.json({ success: true, farmer: farmers[phone] });
});

app.post('/api/farmer/login', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  const found = farmers[phone];
  if (!found) return res.status(404).json({ error: 'Farmer not registered' });
  return res.json({ success: true, farmer: found });
});

app.post('/api/farmer/send-otp', (req, res) => {
  let { phone, registerMode } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  phone = normalizePhone(phone);
  if (registerMode && farmers[phone]) return res.status(409).json({ error: 'Farmer already exists' });
  if (!registerMode && !farmers[phone]) return res.status(404).json({ error: 'Farmer not registered' });
  return res.json({ success: true, message: 'OTP sent (demo 123456)' });
});

app.post('/api/farmer/verify-otp', (req, res) => {
  let { phone, code, registerMode, name, village } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Missing phone/code' });
  phone = normalizePhone(phone);
  if (code !== '123456') return res.status(401).json({ error: 'Invalid OTP' });
  if (registerMode) {
    if (farmers[phone]) return res.status(409).json({ error: 'Farmer already exists' });
    const uid = genUid('FARM', phone);
    farmers[phone] = {
      uid,
      name: name || 'New Farmer',
      phone,
      village: village || 'Coimbatore',
      landAcres: 0,
      crops: [],
      deliverers: 0,
      vehicles: [],
      bankDetails: {
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        email: ''
      },
      onboardingComplete: false,
      mainCrop: 'Coconut',
      farmSize: '2',
      totalEarnings: 0,
      ordersToday: 0,
      rating: '4.9',
      joined: new Date().toISOString()
    };
    saveFarmersData();
  }
  if (!farmers[phone]) return res.status(404).json({ error: 'Farmer not found' });
  return res.json({ success: true, farmer: farmers[phone] });
});

app.post('/api/buyer/register', (req, res) => {
  const { name, phone, email } = req.body;
  if (!name || !phone || !email) return res.status(400).json({ error: 'Missing data' });
  if (buyers[phone]) return res.status(409).json({ error: 'Buyer already exists' });
  const uid = genUid('BUY', phone);
  buyers[phone] = {
    uid,
    name,
    phone,
    email,
    totalSpent: 0,
    ordersCount: 0,
    joined: new Date().toISOString()
  };
  return res.json({ success: true, buyer: buyers[phone] });
});

app.post('/api/buyer/login', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  const found = buyers[phone];
  if (!found) return res.status(404).json({ error: 'Buyer not registered' });
  return res.json({ success: true, buyer: found });
});

app.post('/api/buyer/send-otp', (req, res) => {
  const { phone, registerMode } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  if (registerMode && buyers[phone]) return res.status(409).json({ error: 'Buyer already exists' });
  if (!registerMode && !buyers[phone]) return res.status(404).json({ error: 'Buyer not registered' });
  return res.json({ success: true, message: 'OTP sent (demo 123456)' });
});

app.post('/api/buyer/send-otp', (req, res) => {
  const { phone, registerMode } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  if (registerMode && buyers[phone]) return res.status(409).json({ error: 'Buyer already exists' });
  if (!registerMode && !buyers[phone]) return res.status(404).json({ error: 'Buyer not registered' });
  return res.json({ success: true, message: 'OTP sent (demo 123456)' });
});

app.post('/api/buyer/verify-otp', (req, res) => {
  let { phone, code, registerMode, name, email } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Missing phone/code' });
  phone = normalizePhone(phone);
  if (code !== '123456') return res.status(401).json({ error: 'Invalid OTP' });
  if (registerMode) {
    if (buyers[phone]) return res.status(409).json({ error: 'Buyer already exists' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const uid = genUid('BUY', phone);
    buyers[phone] = {
      uid,
      name: name || 'New Buyer',
      phone,
      email,
      verified: false,
      bankDetails: {
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: ''
      },
      onboardingComplete: false,
      totalSpent: 0,
      ordersCount: 0,
      joined: new Date().toISOString(),
      orderHistory: []
    };
    saveBuyersData(); // Save to file
  }
  if (!buyers[phone]) return res.status(404).json({ error: 'Buyer not found' });
  return res.json({ success: true, buyer: buyers[phone] });
});

app.post('/api/buyer/onboarding', (req, res) => {
  let { phone, bankDetails } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  phone = normalizePhone(phone);
  if (!buyers[phone]) return res.status(404).json({ error: 'Buyer not found' });
  
  buyers[phone] = {
    ...buyers[phone],
    bankDetails: bankDetails || {},
    onboardingComplete: true
  };
  
  saveBuyersData(); // Save to file
  return res.json({ success: true, buyer: buyers[phone] });
});

// Serve home page on root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.listen(3000, () => {
  console.log('VayalDirect mock API running on http://localhost:3000');
});
