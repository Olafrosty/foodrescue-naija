const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== DB SETUP =====
const DB_FILE = path.join(__dirname, 'foods.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

const MSG_FILE = path.join(__dirname, 'messages.json');
if (!fs.existsSync(MSG_FILE)) fs.writeFileSync(MSG_FILE, '[]');

const getFoods = () => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
  catch { return []; }
};
const saveFoods = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const getMsgs = () => {
  try { return JSON.parse(fs.readFileSync(MSG_FILE, 'utf8')); }
  catch { return []; }
};
const saveMsgs = (data) => fs.writeFileSync(MSG_FILE, JSON.stringify(data, null, 2));

// ===== FOOD API =====
app.get('/api/foods', (req, res) => res.json(getFoods()));

app.post('/api/donate', (req, res) => {
  const foods = getFoods();
  const newFood = {
    id: Date.now().toString(),
    _id: Date.now().toString(),
    foodName: req.body.foodName || req.body.name || 'Food Donation',
    name: req.body.foodName || req.body.name || 'Food Donation',
    quantity: req.body.quantity || '1 plate',
    location: req.body.location || req.body.address || req.body.lga || 'Ibadan',
    lga: req.body.lga || 'Ibadan',
    state: req.body.state || 'Oyo',
    address: req.body.address || req.body.location || 'Ibadan',
    pickupTime: req.body.pickupTime || req.body.pickup_time || 'ASAP',
    pickup_time: req.body.pickupTime || req.body.pickup_time || 'ASAP',
    expiry: req.body.expiry || '',
    phone: req.body.phone || '',
    notes: req.body.notes || '',
    category: req.body.category || req.body.foodName || 'Other',
    image: req.body.image || '',
    status: 'Available',
    date: new Date().toISOString()
  };
  foods.unshift(newFood);
  saveFoods(foods);
  console.log('NEW DONATION:', newFood.foodName, 'at', newFood.location);
  res.json({ success: true, food: newFood });
});

app.post('/api/foods', (req, res) => {
  const foods = getFoods();
  const newFood = { 
    id: Date.now().toString(), 
    _id: Date.now().toString(),
    status: 'Available', 
    ...req.body, 
    date: new Date().toISOString() 
  };
  foods.unshift(newFood);
  saveFoods(foods);
  res.json({ success: true, food: newFood });
});

app.put('/api/foods/:id/claim', (req, res) => {
  let foods = getFoods();
  foods = foods.map(f => (f.id == req.params.id || f._id == req.params.id) ? { ...f, status: 'Claimed' } : f);
  saveFoods(foods);
  res.json({ success: true });
});

app.delete('/api/foods/:id', (req, res) => {
  let foods = getFoods();
  const before = foods.length;
  foods = foods.filter(f => f.id != req.params.id && f._id != req.params.id);
  saveFoods(foods);
  console.log(`Deleted food ${req.params.id}. Before:${before} After:${foods.length}`);
  res.json({ success: true, deleted: before - foods.length });
});

app.delete('/api/foods', (req, res) => {
  // clear all claimed if ?status=Claimed
  if(req.query.status === 'Claimed'){
    let foods = getFoods().filter(f => f.status !== 'Claimed');
    saveFoods(foods);
    return res.json({ success: true, remaining: foods.length });
  }
  saveFoods([]);
  res.json({ success: true });
});

// ===== CONTACT MESSAGE API =====
app.post('/api/contact', (req, res) => {
  const msgs = getMsgs();
  const newMsg = {
    id: Date.now().toString(),
    name: req.body.name || 'Anonymous',
    phone: req.body.phone || '',
    email: req.body.email || '',
    message: req.body.message || '',
    helpType: req.body.helpType || req.body.help || 'Donate Food',
    date: new Date().toISOString()
  };
  msgs.unshift(newMsg);
  saveMsgs(msgs);
  console.log('NEW CONTACT MESSAGE:', newMsg.name, '-', newMsg.email, '-', newMsg.message.substring(0,60));
  res.json({ success: true, message: newMsg });
});

app.get('/api/messages', (req, res) => {
  res.json(getMsgs());
});

app.delete('/api/messages/:id', (req, res) => {
  let msgs = getMsgs();
  msgs = msgs.filter(m => m.id != req.params.id);
  saveMsgs(msgs);
  res.json({ success: true });
});

app.delete('/api/messages/clear', (req, res) => {
  saveMsgs([]);
  res.json({ success: true });
});

// alias for frontend that calls DELETE /api/messages
app.delete('/api/messages', (req, res) => {
  saveMsgs([]);
  res.json({ success: true });
});

// ===== PAGES - Express 5 compatible =====
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/*splat', (req, res) => {
  const requestedPath = path.join(__dirname, req.path);
  if (fs.existsSync(requestedPath) && req.path.endsWith('.html')) {
    return res.sendFile(requestedPath);
  }
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return res.sendFile(requestedPath);
  }
  if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.status(404).send('File not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('FoodRescue Naija running on', PORT, 'API ready'));
