'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Transactions',
      'timestamp',
     Sequelize.STRING
    );
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn(
      'Transactions',
      'timestamp'
    );
  }
};
