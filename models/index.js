const sequelize = require('../config/database');

// Import models here as you add them
const User = require('./User');

// Register associations here (e.g. User.hasMany(Playlist))

module.exports = { sequelize, User };
