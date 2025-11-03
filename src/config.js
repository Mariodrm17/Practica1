module.exports = {
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/portal_productos',
  jwtSecret: process.env.JWT_SECRET || 'mi_secreto_super_seguro',
  port: process.env.PORT || 3000
};