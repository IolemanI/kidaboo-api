import Sequelize from 'sequelize';
import db from '../lib/db';

const AuthDataModel = db.define('AuthData', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // fk - Users table
  UserId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  confirmed: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    required: true,
  },
  refreshToken: {
    type: Sequelize.STRING,
  },
  confirmationToken: {
    type: Sequelize.STRING,
  },
  resetToken: {
    type: Sequelize.STRING,
  },
},
{
  tableName: 'AuthData',
});

exports.AuthData = AuthDataModel; // eslint-disable-line no-undef