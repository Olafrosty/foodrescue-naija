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

const BLOCK_FILE = path.join(__dirname, 'blocked_phones.json');
if (!fs.existsSync(BLOCK_FILE)) fs.writeFileSync(BLOCK_FILE, '[]');

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

const getBlocked = () => {
  try { return JSON.parse(fs.readFileSync(BLOCK_FILE, 'utf8')); }
  catch { return []; }
};
const saveBlocked = (data) => fs.writeFileSync(BLOCK_FILE, JSON.stringify(data, null, 2));

// ===== SECURITY CONFIG =====
const VERIFIED_HUBS = [
  "Dugbe Hub - No 12 Awolowo Ave, Dugbe, Ibadan",
  "Bodija Market - FoodRescue Point",
  "UI Campus - Student Affairs Gate",
  "Challenge - FoodRescue Volunteer Point",
  "Ring Road - Ibadan Food Bank",
  "Mokola - Agodi Park",
  "Other Public Place - Church/Mosque/NGO"
];

const BANNED_WORDS = ["my house", "my home", "house address", "my room", "bedroom", "private residence", "come to my house"];

function isHomeAddress(text){
  if(!text) return false;
  const lower = text.toLowerCase();
  return BANNED_WORDS.some(w => lower.includes(w));
}

function isNightPickup(pickupTime){
  if(!pickupTime) return false;
  const lower = pickupTime.toLowerCase();
  // Reject any night keywords or times outside 8AM-6PM
  if(lower.includes("pm") && (lower.includes("7pm")||lower.includes("8pm")||lower.includes("9pm")||lower.includes("10pm")||lower.includes("11pm")||lower.includes("12am")||lower.includes("midnight")||lower.includes("night"))){
    // Allow 6pm max, block 7pm+
    if(lower.includes("7pm")||lower.includes("8pm")||lower.includes("9pm")||lower.includes("10pm")||lower.includes("11pm")) return true;
  }
  if(lower.includes("19:")||lower.includes("20:")||lower.includes("21:")||lower.includes("22:")||lower.includes("23:")) return true;
  return false;
}

function generateCode(){
  return Math.floor(1000 + Math.random()*9000).toString();
}

// ===== FOOD API =====
app.get('/api/foods', (req, res) => {
  let foods = getFoods();
  // Hide foods with 2+ reports or unverified >24h? For public, filter hidden
  if(req.query.public === 'true'){
    foods = foods.filter(f => (f.reports||0) < 2 && f.hidden!== true);
  }
  res.json(foods);
});

// SECURE DONATE
app.post('/api/donate', (req, res) => {
  const phone = (req.body.phone||"").trim();

  // 1. Blocked phone check
  if(getBlocked().includes(phone)){
    return res.status(403).json({ success:false, error:"Phone number blocked due to multiple reports. Contact admin." });
  }

  // 2. No Home Address
  const loc = req.body.location || req.body.address || "";
  if(isHomeAddress(loc) || isHomeAddress(req.body.notes||"")){
    return res.status(400).json({ success:false, error:"SECURITY: Home addresses are banned. Use Hub/Market/Church only." });
  }

  // 3. Daylight Only
  if(isNightPickup(req.body.pickupTime || req.body.pickup_time || "")){
    return res.status(400).json({ success:false, error:"SECURITY: Night pickup banned. Only 8AM-6PM allowed." });
  }

  // 4. Must be verified Hub (allow if contains hub name)
  const isValidHub = VERIFIED_HUBS.some(h => loc.includes(h.split(' - ')[0]) || loc===h);
  if(!isValidHub && loc.length < 10){
    // if too short or not hub-like, warn but allow for now with flag
    console.log("WARNING: Non-standard hub location:", loc);
  }

  const foods = getFoods();
  const code = generateCode();
  const newFood = {
    id: Date.now().toString(),
    _id: Date.now().toString(),
    foodName: req.body.foodName || req.body.name || 'Food Donation',
    name: req.body.foodName || req.body.name || 'Food Donation',
    quantity: req.body.quantity || '1 plate',
    location: loc || VERIFIED_HUBS[0],
    lga: req.body.lga || 'Ibadan',
    state: req.body.state || 'Oyo',
    address: loc || VERIFIED_HUBS[0],
    hub: loc || VERIFIED_HUBS[0],
    pickupTime: req.body.pickupTime || req.body.pickup_time || 'Today 11AM - 2PM',
    pickup_time: req.body.pickupTime || req.body.pickup_time || 'Today 11AM - 2PM',
    expiry: req.body.expiry || '',
    phone: phone,
    contactName: req.body.contactName || '',
    notes: req.body.notes || '',
    category: req.body.category || 'Other',
    image: req.body.image || '',
    status: 'Available',
    verified: false, // needs volunteer call
    pickupCode: code,
    reports: 0,
    hidden: false,
    ngoPriority: true,
    date: new Date().toISOString(),
    claimedBy: null,
    claimCodeAttempts: 0
  };
  foods.unshift(newFood);
  saveFoods(foods);
  console.log(`NEW SECURE DONATION: ${newFood.foodName} | Hub: ${newFood.location} | Code: ${code} | Phone: ${phone}`);
  res.json({ success: true, food: newFood, message: `Donation received. Pickup Code: ${code}. Volunteer will verify within 2h.` });
});

app.post('/api/foods', (req,res)=> {
  // Alias to secure donate
  req.body.location = req.body.location || req.body.address;
  return app._router.handle({...req, url:'/api/donate', method:'POST'}, res, ()=>{});
});

// VERIFY FOOD (volunteer calls)
app.put('/api/foods/:id/verify', (req,res)=>{
  let foods = getFoods();
  foods = foods.map(f => (f.id==req.params.id || f._id==req.params.id)? {...f, verified:true, status:'Available'} : f);
  saveFoods(foods);
  res.json({ success:true });
});

// CLAIM WITH CODE
app.put('/api/foods/:id/claim', (req, res) => {
  const { code, claimerPhone, claimerName } = req.body;
  let foods = getFoods();
  let food = foods.find(f=> f.id==req.params.id || f._id==req.params.id);
  if(!food) return res.status(404).json({success:false, error:"Food not found"});

  // Check code
  if(!code || code!== food.pickupCode){
    food.claimCodeAttempts = (food.claimCodeAttempts||0)+1;
    if(food.claimCodeAttempts >= 3){
      food.reports = (food.reports||0)+1;
      if(food.reports>=2) food.hidden = true;
    }
    saveFoods(foods);
    return res.status(400).json({ success:false, error:"Invalid pickup code. No code, no food." });
  }

  foods = foods.map(f => (f.id == req.params.id || f._id == req.params.id)? {...f, status: 'Claimed', claimedBy: claimerName||claimerPhone||'NGO', claimedAt: new Date().toISOString() } : f);
  saveFoods(foods);
  console.log(`CLAIMED with code ${code}: ${food.foodName}`);
  res.json({ success: true, message:"Claimed successfully. Enjoy!" });
});

// REPORT & BAN
app.post('/api/foods/:id/report', (req,res)=>{
  const { reason, reporterPhone } = req.body;
  let foods = getFoods();
  let blocked = getBlocked();
  let target = foods.find(f=> f.id==req.params.id || f._id==req.params.id);
  if(!target) return res.status(404).json({success:false});

  target.reports = (target.reports||0)+1;
  target.lastReportReason = reason||"Suspicious";
  target.lastReportedAt = new Date().toISOString();

  if(target.reports >= 2){
    target.hidden = true;
    target.status = "Under Review";
    console.log(`AUTO-HIDDEN after 2 reports: ${target.foodName} ID:${target.id}`);
  }

  // If 3+ reports, block donor phone
  if(target.reports >= 3 && target.phone &&!blocked.includes(target.phone)){
    blocked.push(target.phone);
    saveBlocked(blocked);
    console.log(`BLOCKED PHONE ${target.phone} after 3 reports`);
  }

  foods = foods.map(f=> (f.id==req.params.id || f._id==req.params.id)? target : f);
  saveFoods(foods);
  res.json({ success:true, reports: target.reports, hidden: target.hidden, blocked: blocked.includes(target.phone) });
});

app.get('/api/blocked', (req,res)=> res.json(getBlocked()));

app.post('/api/unblock', (req,res)=>{
  const { phone } = req.body;
  let blocked = getBlocked().filter(p=> p!==phone);
  saveBlocked(blocked);
  res.json({success:true, blocked});
});

app.delete('/api/foods/:id', (req, res) => {
  let foods = getFoods();
  const before = foods.length;
  foods = foods.filter(f => f.id!= req.params.id && f._id!= req.params.id);
  saveFoods(foods);
  res.json({ success: true, deleted: before - foods.length });
});

app.delete('/api/foods', (req, res) => {
  if(req.query.status === 'Claimed'){
    let foods = getFoods().filter(f => f.status!== 'Claimed');
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
  console.log('NEW CONTACT:', newMsg.name, newMsg.email);
  res.json({ success: true, message: newMsg });
});

app.get('/api/messages', (req, res) => res.json(getMsgs()));
app.delete('/api/messages/clear', (req, res) => { saveMsgs([]); res.json({ success: true }); });
app.delete('/api/messages', (req, res) => { saveMsgs([]); res.json({ success: true }); });
app.delete('/api/messages/:id', (req, res) => {
  let msgs = getMsgs().filter(m => m.id!= req.params.id);
  saveMsgs(msgs);
  res.json({ success: true });
});

// ===== PAGES =====
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/*splat', (req, res) => {
  const requestedPath = path.join(__dirname, req.path);
  if (fs.existsSync(requestedPath) && req.path.endsWith('.html')) return res.sendFile(requestedPath);
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) return res.sendFile(requestedPath);
  if (fs.existsSync(path.join(__dirname, 'index.html'))) return res.sendFile(path.join(__dirname, 'index.html'));
  res.status(404).send('File not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('FoodRescue Naija SECURE running on', PORT, '| Hubs:', VERIFIED_HUBS.length, '| Safety ON'));
