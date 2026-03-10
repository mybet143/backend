const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET || "secret"
    );
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};