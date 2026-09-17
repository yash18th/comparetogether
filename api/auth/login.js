var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/auth/login.ts
var login_exports = {};
__export(login_exports, {
  default: () => handler
});
module.exports = __toCommonJS(login_exports);
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
