import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Verifies the Bearer token, loads the user, and attaches it to req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    // EventSource (used for SSE streaming) can't set custom headers, so it
    // authenticates via a `token` query param instead. Bearer header wins
    // if both are present.
    const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token || null;

    if (!token) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
