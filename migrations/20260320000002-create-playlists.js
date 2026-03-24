'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Playlists', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      spotifyPlaylistId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      trackCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      snapshotId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // One playlist per user per Spotify playlist
    await queryInterface.addIndex('Playlists', ['userId', 'spotifyPlaylistId'], {
      unique: true,
      name: 'playlists_user_spotify_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Playlists');
  },
};
