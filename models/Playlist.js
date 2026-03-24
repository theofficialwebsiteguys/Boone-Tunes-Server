const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Playlist = sequelize.define(
  'Playlist',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    spotifyPlaylistId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trackCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Spotify snapshot_id — changes when playlist contents change
    snapshotId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'spotifyPlaylistId'], name: 'playlists_user_spotify_unique' },
    ],
  }
);

module.exports = Playlist;
