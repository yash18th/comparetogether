import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

const SUPPORTED_LOCATIONS = [
  {
    city: 'Bangalore',
    areas: [
      { name: 'Indiranagar', pincode: '560038', popular: true },
      { name: 'Koramangala', pincode: '560095', popular: true },
      { name: 'HSR Layout', pincode: '560102', popular: true },
      { name: 'Whitefield', pincode: '560066', popular: true },
      { name: 'JP Nagar', pincode: '560078', popular: false },
      { name: 'Jayanagar', pincode: '560011', popular: false }
    ]
  },
  {
    city: 'Mumbai',
    areas: [
      { name: 'Bandra West', pincode: '400050', popular: true },
      { name: 'Andheri West', pincode: '400053', popular: true },
      { name: 'Powai', pincode: '400076', popular: false }
    ]
  },
  {
    city: 'Delhi NCR',
    areas: [
      { name: 'Connaught Place', pincode: '110001', popular: true },
      { name: 'Cyber City Gurgaon', pincode: '122002', popular: true }
    ]
  }
];

// Get all supported cities & delivery zones
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: SUPPORTED_LOCATIONS
  });
});

// Reverse-geocode / find nearest area from coordinates
router.post('/detect', (req, res) => {
  const { latitude, longitude } = req.body;
  // Default to Indiranagar, Bangalore for demo/test
  res.json({
    success: true,
    data: {
      city: 'Bangalore',
      area: 'Indiranagar',
      pincode: '560038',
      formatted: 'Indiranagar, Bangalore - 560038'
    }
  });
});

export default router;
