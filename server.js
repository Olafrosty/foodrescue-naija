const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve ALL html files from root folder (where server.js is)
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'foods.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

const getFoods = () => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
  catch { return []; }
};
const saveFoods = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API ROUTES ---
app.get('/api/foods', (req, res) => res.json(getFoods()));

app.post('/api/donate', (req, res) => {
  const foods = getFoods();
  const newFood = {
    id: Date.now().toString(),
    _id: Date.now().toString(),
    foodName: req.body.foodName || 'Food Donation',
    quantity: req.body.quantity,
    location: req.body.location || req.body.address,
    lga: req.body.lga || req.body.location || 'Ibadan',
    state: req.body.state || 'Oyo',
    address: req.body.address || req.body.location,
    pickupTime: req.body.pickupTime,
    expiry: req.body.expiry,
    phone: req.body.phone,
    notes: req.body.notes,
    category: req.body.category,
    status: 'Available',
    date: new Date().toISOString()
  };
  foods.unshift(newFood);
  saveFoods(foods);
  res.json({ success: true, food: newFood });
});

// Support both POST routes
app.post('/api/foods', (req, res) => {
  const foods = getFoods();
  foods.unshift({ id: Date.now().toString(), _id: Date.now().toString(), status: 'Available', ...req.body, date: new Date().toISOString() });
  saveFoods(foods);
  res.json({ success: true });
});

app.put('/api/foods/:id/claim', (req, res) => {
  let foods = getFoods();
  foods = foods.map(f => (f.id == req.params.id || f._id == req.params.id) ? { ...f, status: 'Claimed' } : f);
  saveFoods(foods);
  res.json({ success: true });
});

// --- FIX FOR Cannot GET / ---
// Serve index.html for root and all html pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/available_food.html', (req, res) => res.sendFile(path.join(__dirname, 'available_food.html')));
app.get('/donate_food.html', (req, res) => res.sendFile(path.join(__dirname, 'donate_food.html')));
app.get('/impact.html', (req, res) => res.sendFile(path.join(__dirname, 'impact.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));

// Fallback for any other page
app.get('*', (req, res) => {
  if (req.path.includes('.html')) {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('FoodRescue running on port', PORT));
