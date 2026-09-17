function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }
  const isDemo = email.includes("user") || email.includes("test") || email.includes("admin");
  const role = email.includes("admin") ? "admin" : "user";
  const name = email.includes("admin") ? "System Admin" : "Verified Foodie";
  const token = `fc_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: isDemo ? "usr_demo" : `usr_${Date.now()}`,
        name,
        email,
        role
      }
    }
  });
}

export default handler;
