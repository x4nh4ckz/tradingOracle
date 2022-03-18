'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ChildWallets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      address: {
        type: Sequelize.STRING
      },
      parentID: {
        type: Sequelize.STRING
      },
      projectID: {
        type: Sequelize.STRING
      },
      balanceStart: {
        type: Sequelize.STRING
      },
      balanceEnd: {
        type: Sequelize.STRING
      },
      timestampStart: {
        type: Sequelize.STRING
      },
      timestampEnd: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ChildWallets');
  }
};