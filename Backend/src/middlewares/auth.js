export function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "No autenticado" });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role) return res.status(401).json({ error: "No autenticado" });
    if (!roles.includes(role)) return res.status(403).json({ error: "Sin permisos" });
    next();
  };
}
