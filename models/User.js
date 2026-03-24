const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    // Nullable — Spotify/Google OAuth users won't have a password
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ── Spotify OAuth ─────────────────────────────────────────────────────────
    spotifyId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    spotifyAccessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    spotifyRefreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    spotifyTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ── Google OAuth (optional login method) ──────────────────────────────────
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = User;
