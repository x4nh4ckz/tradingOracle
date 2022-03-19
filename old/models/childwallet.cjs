'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ChildWallet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ChildWallet.init({
    address: DataTypes.STRING,
    parentID: DataTypes.STRING,
    projectID: DataTypes.STRING,
    balanceStart: DataTypes.STRING,
    balanceEnd: DataTypes.STRING,
    timestampStart: DataTypes.STRING,
    timestampEnd: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'ChildWallet',
  });
  return ChildWallet;
};