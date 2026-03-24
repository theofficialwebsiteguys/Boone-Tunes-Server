const sequelize = require('../config/database');

const User = require('./User');
const Playlist = require('./Playlist');

// Associations
User.hasMany(Playlist, { foreignKey: 'userId', onDelete: 'CASCADE' });
Playlist.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Playlist };
