'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ParentWallet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ParentWallet.init({
    address: DataTypes.STRING,
    balance: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'ParentWallet',
  });
  return ParentWallet;
};