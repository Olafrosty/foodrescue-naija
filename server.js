const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT ||3000;
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
const DB_FILE = path.join(__dirname, 'database.json');
if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({donations:[]}));
function readDB(){ return JSON.parse(fs.readFileSync(DB_FILE)); }
function writeDB(d){ fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }
app.post('/api/donate', (req,res)=>{
  const db=readDB();
  db.donations.unshift({id:Date.now(),...req.body,status:'Available',date:new Date().toLocaleString()});
  writeDB(db);
  res.json({success:true});
});
app.get('/api/foods',(req,res)=> res.json(readDB().donations));
app.put('/api/foods/:id/claim',(req,res)=>{
  const db=readDB();
  db.donations=db.donations.map(f=> f.id==req.params.id?{...f,status:'Claimed'}:f);
  writeDB(db);
  res.json({success:true});
});
app.listen(PORT, ()=> console.log('Server running on http://localhost:'+PORT));