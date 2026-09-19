# FoodRescue Naija - Zero Food Waste Platform

> A Full-Stack Web Platform Connecting Food Donors to Those in Need in Nigeria
> Aligned with UN Sustainable Development Goals (SDG) 2, 12, 13

**Live URL:** http://localhost:3000/index.html (after running `node server.js`)
**Stack:** HTML, CSS, JavaScript (Frontend) + Node.js, Express.js, JSON DB (Backend)

---

### 🎯 Problem Statement
In Nigeria, 40% of food produced is wasted daily while millions face hunger (SDG 2). Food waste contributes to methane emissions (SDG 13) and inefficient consumption (SDG 12).

### 💡 Solution
FoodRescue Naija allows restaurants, events, and households to donate surplus food in real-time. NGOs and individuals can claim nearby food via map view, reducing waste and hunger.

### 🌱 SDG Alignment

| SDG | How We Address It |
|-----|-------------------|
| **SDG 2: Zero Hunger** | Connects surplus food to food-insecure communities |
| **SDG 12: Responsible Consumption** | Reduces food waste, promotes circular food economy |
| **SDG 13: Climate Action** | Prevents methane emissions from food rotting in landfills |

### ✨ Features
- Donate surplus food with quantity, location, expiry
- View available foods in real-time
- Claim food (changes status to Claimed)
- Interactive Map View (OpenStreetMap)
- Impact Dashboard (kg of food saved, CO2 prevented, people fed)
- 100% Functional Backend, no LocalStorage

### 🛠️ Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** JSON file persistence (`database.json`) - simulates real DB
- **APIs:** RESTful APIs

### 🔌 API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/donate | Add new food donation |
| GET | /api/foods | Get all donated foods |
| PUT | /api/foods/:id/claim | Claim a food item |

**Example POST /api/donate body:**
```json
{
  "foodName": "Jollof Rice",
  "quantity": "10 plates",
  "location": "Port Harcourt, Rivers",
  "expiry": "Today 6pm"
}