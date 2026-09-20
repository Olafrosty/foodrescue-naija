const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'foods.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

const getFoods = () => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
  catch { return []; }
};
const saveFoods = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API
app.get('/api/foods', (req, res) => res.json(getFoods()));

app.post('/api/donate', (req, res) => {
  const foods = getFoods();
  const newFood = {
    id: Date.now().toString(),
    _id: Date.now().toString(),
    foodName: req.body.foodName || 'Food Donation',
    quantity: req.body.quantity,
    location: req.body.location || req.body.address || 'Ibadan',
    lga: req.body.lga || 'Ibadan',
    state: req.body.state || 'Oyo',
    address: req.body.address || req.body.location,
    pickupTime: req.body.pickupTime,
    expiry: req.body.expiry,
    phone: req.body.phone,
    notes: req.body.notes,
    status: 'Available',
    date: new Date().toISOString()
  };
  foods.unshift(newFood);
  saveFoods(foods);
  res.json({ success: true, food: newFood });
});

app.post('/api/foods', (req, res) => {
  const foods = getFoods();
  foods.unshift({ id: Date.now().toString(), status: 'Available', ...req.body, date: new Date().toISOString() });
  saveFoods(foods);
  res.json({ success: true });
});

app.put('/api/foods/:id/claim', (req, res) => {
  let foods = getFoods();
  foods = foods.map(f => (f.id == req.params.id || f._id == req.params.id) ? { ...f, status: 'Claimed' } : f);
  saveFoods(foods);
  res.json({ success: true });
});

// PAGES - Express 5 compatible
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// This line fixes Cannot GET / and all html
app.get('/*splat', (req, res) => {
  const requestedPath = path.join(__dirname, req.path);
  // if file exists like /available_food.html serve it
  if (fs.existsSync(requestedPath) && req.path.endsWith('.html')) {
    return res.sendFile(requestedPath);
  }
  // otherwise serve index.html
  if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.status(404).send('File not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('FoodRescue running on', PORT));
