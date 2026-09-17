// api/_lib/catalogData.ts
var BRANCHES = [
  {
    "id": "br_emp_ind",
    "restaurant_id": "rest_empire",
    "name": "Empire - Indiranagar",
    "address": "80 Feet Road, HAL 2nd Stage, Indiranagar",
    "city": "Bangalore",
    "area": "Indiranagar",
    "pincode": "560038",
    "latitude": 12.9716,
    "longitude": 77.6412,
    "delivery_radius_km": 7,
    "is_active": 1
  },
  {
    "id": "br_emp_kor",
    "restaurant_id": "rest_empire",
    "name": "Empire - Koramangala",
    "address": "5th Block, Jyoti Nivas College Road",
    "city": "Bangalore",
    "area": "Koramangala",
    "pincode": "560095",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "delivery_radius_km": 6.5,
    "is_active": 1
  },
  {
    "id": "br_emp_whi",
    "restaurant_id": "rest_empire",
    "name": "Empire - Whitefield",
    "address": "ITPL Main Road, Brookefield",
    "city": "Bangalore",
    "area": "Whitefield",
    "pincode": "560066",
    "latitude": 12.9698,
    "longitude": 77.7499,
    "delivery_radius_km": 8,
    "is_active": 1
  },
  {
    "id": "br_emp_hsr",
    "restaurant_id": "rest_empire",
    "name": "Empire - HSR Layout",
    "address": "Sector 7, 14th Main Road",
    "city": "Bangalore",
    "area": "HSR Layout",
    "pincode": "560102",
    "latitude": 12.9121,
    "longitude": 77.6446,
    "delivery_radius_km": 6,
    "is_active": 1
  },
  {
    "id": "br_emp_jpn",
    "restaurant_id": "rest_empire",
    "name": "Empire - JP Nagar",
    "address": "24th Main Road, JP Nagar 5th Phase",
    "city": "Bangalore",
    "area": "JP Nagar",
    "pincode": "560078",
    "latitude": 12.9063,
    "longitude": 77.5857,
    "delivery_radius_km": 6.5,
    "is_active": 1
  },
  {
    "id": "br_meg_ind",
    "restaurant_id": "rest_meghana",
    "name": "Meghana Foods - Indiranagar",
    "address": "CMH Road, Near Metro Station, Indiranagar",
    "city": "Bangalore",
    "area": "Indiranagar",
    "pincode": "560038",
    "latitude": 12.9784,
    "longitude": 77.6408,
    "delivery_radius_km": 6,
    "is_active": 1
  },
  {
    "id": "br_meg_kor",
    "restaurant_id": "rest_meghana",
    "name": "Meghana Foods - Koramangala",
    "address": "1st Block, Near Forum Mall, Koramangala",
    "city": "Bangalore",
    "area": "Koramangala",
    "pincode": "560095",
    "latitude": 12.934,
    "longitude": 77.619,
    "delivery_radius_km": 7,
    "is_active": 1
  },
  {
    "id": "br_truf_kor",
    "restaurant_id": "rest_truffles",
    "name": "Truffles - Koramangala",
    "address": "93, 4th B Cross, 5th Block, Koramangala",
    "city": "Bangalore",
    "area": "Koramangala",
    "pincode": "560095",
    "latitude": 12.9348,
    "longitude": 77.6212,
    "delivery_radius_km": 6,
    "is_active": 1
  },
  {
    "id": "br_truf_ind",
    "restaurant_id": "rest_truffles",
    "name": "Truffles - Indiranagar",
    "address": "100 Feet Road, Indiranagar",
    "city": "Bangalore",
    "area": "Indiranagar",
    "pincode": "560038",
    "latitude": 12.969,
    "longitude": 77.643,
    "delivery_radius_km": 6.5,
    "is_active": 1
  },
  {
    "id": "br_nag_ind",
    "restaurant_id": "rest_nagarjuna",
    "name": "Nagarjuna - Indiranagar",
    "address": "Double Road, Indiranagar",
    "city": "Bangalore",
    "area": "Indiranagar",
    "pincode": "560038",
    "latitude": 12.971,
    "longitude": 77.64,
    "delivery_radius_km": 6,
    "is_active": 1
  },
  {
    "id": "br_twc_ind",
    "restaurant_id": "rest_thirdwave",
    "name": "Third Wave Coffee - Indiranagar",
    "address": "12th Main Road, Indiranagar",
    "city": "Bangalore",
    "area": "Indiranagar",
    "pincode": "560038",
    "latitude": 12.972,
    "longitude": 77.642,
    "delivery_radius_km": 5,
    "is_active": 1
  },
  {
    "id": "br_twc_kor",
    "restaurant_id": "rest_thirdwave",
    "name": "Third Wave Coffee - Koramangala",
    "address": "4th Block, 80 Feet Road, Koramangala",
    "city": "Bangalore",
    "area": "Koramangala",
    "pincode": "560034",
    "latitude": 12.932,
    "longitude": 77.628,
    "delivery_radius_km": 5,
    "is_active": 1
  }
];

// api/_lib/engine.ts
function getAllLocations() {
  const seen = /* @__PURE__ */ new Set();
  const list = [];
  for (const b of BRANCHES) {
    if (!b.is_active) continue;
    const key = `${b.city}:${b.area}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push({
        city: b.city,
        area: b.area,
        pincode: b.pincode
      });
    }
  }
  return list;
}

// api/locations.ts
function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const locations = getAllLocations();
  res.status(200).json({
    success: true,
    data: locations
  });
}

export default handler;
