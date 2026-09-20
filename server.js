const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // your html files folder

const DB_FILE = './foods.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

function getFoods() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveFoods(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// GET for Available Food page
app.get('/api/foods', (req, res) => {
  res.json(getFoods());
});

// POST for Donate page - THIS IS THE FIX
app.post('/api/donate', (req, res) => {
  const foods = getFoods();
  const newFood = {
    id: Date.now().toString(),
    _id: Date.now().toString(),
    foodName: req.body.foodName,
    quantity: req.body.quantity,
    location: req.body.location || req.body.address,
    lga: req.body.lga || '',
    state: req.body.state || 'Oyo',
    address: req.body.address || req.body.location,
    pickupTime: req.body.pickupTime,
    pickup_time: req.body.pickupTime,
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

// Also support old route /api/foods POST
app.post('/api/foods', (req, res) => {
  const foods = getFoods();
  foods.unshift({ id: Date.now().toString(), status: 'Available', ...req.body });
  saveFoods(foods);
  res.json({ success: true });
});

// Claim route
app.put('/api/foods/:id/claim', (req, res) => {
  let foods = getFoods();
  foods = foods.map(f => (f.id == req.params.id || f._id == req.params.id) ? { ...f, status: 'Claimed' } : f);
  saveFoods(foods);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on', PORT));
