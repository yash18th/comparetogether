function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  res.status(200).json({
    connected: false,
    status: "INTEGRATION_PENDING",
    expiresAt: null,
    address: null
  });
}

export default handler;
