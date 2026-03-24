'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make passwordHash nullable — Spotify OAuth users won't have one
    await queryInterface.changeColumn('Users', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'displayName', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'spotifyId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('Users', 'spotifyAccessToken', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'spotifyRefreshToken', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'spotifyTokenExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'googleId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'googleId');
    await queryInterface.removeColumn('Users', 'spotifyTokenExpiresAt');
    await queryInterface.removeColumn('Users', 'spotifyRefreshToken');
    await queryInterface.removeColumn('Users', 'spotifyAccessToken');
    await queryInterface.removeColumn('Users', 'spotifyId');
    await queryInterface.removeColumn('Users', 'displayName');

    await queryInterface.changeColumn('Users', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
