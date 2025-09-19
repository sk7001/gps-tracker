require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const UAParser = require('ua-parser-js');
const app = express();


app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


const locationSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  accuracy: Number,
  timestamp: Number,
  ipAddress: String,
  userAgent: String,
  device: String,
  browser: String,
  os: String,
  geo: {
    country: String,
    region: String,
    city: String,
    lat: Number,
    lon: Number,
    isp: String
  },
  gmapsLink: String
}, { collection: 'locations' });

const Location = mongoose.model('Location', locationSchema);

app.post('/api/location', async (req, res) => {
  try {
    const { latitude, longitude, accuracy, timestamp } = req.body;
    let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0].trim();
    if (ipAddress.startsWith('::ffff:')) ipAddress = ipAddress.replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const device = parser.getDevice().type || 'desktop';
    const browser = parser.getBrowser().name + ' ' + parser.getBrowser().version;
    const os = parser.getOS().name + ' ' + parser.getOS().version;

    // Default geo
    let geo = { country: '', region: '', city: '', lat: null, lon: null, isp: '' };
    try {
      if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
        const geoRes = await axios.get(`http://ip-api.com/json/${ipAddress}`);
        if (geoRes.data && geoRes.data.status === 'success') {
          geo = {
            country: geoRes.data.country,
            region: geoRes.data.regionName,
            city: geoRes.data.city,
            lat: geoRes.data.lat,
            lon: geoRes.data.lon,
            isp: geoRes.data.isp
          };
        }
      }
    } catch (geoErr) {
      console.error('Geo-IP lookup failed:', geoErr.message);
    }

    console.log('Received location POST:', { latitude, longitude, accuracy, timestamp, ipAddress, userAgent, device, browser, os, geo });
    if (latitude == null || longitude == null || accuracy == null || timestamp == null) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const gmapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const location = new Location({ latitude, longitude, accuracy, timestamp, ipAddress, userAgent, device, browser, os, geo, gmapsLink });
    await location.save();
    console.log('Location saved to DB');
    res.status(201).json({ message: 'Location saved', gmapsLink });
  } catch (err) {
    console.error('Error in /api/location:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find().sort({ timestamp: -1 });
    console.log('Returned all locations');
    res.json(locations);
  } catch (err) {
    console.error('Error in /api/locations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gps-tracker';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
