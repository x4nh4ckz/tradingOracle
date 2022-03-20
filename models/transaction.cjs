'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Transaction.init({
    params: DataTypes.STRING,
    amount: DataTypes.STRING,
    hash: DataTypes.STRING,
    isOut: DataTypes.BOOLEAN,
    blockNumber: DataTypes.STRING,
    from: DataTypes.STRING,
    to: DataTypes.STRING,
    timestamp: DataTypes.STRING,
    parentWallet: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Transaction',
  });
  return Transaction;
};