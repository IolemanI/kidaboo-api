import Sequelize from 'sequelize';
import db from '../lib/db';
import { AuthData } from './AuthData';

const UsersModel = db.define('Users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: Sequelize.STRING(255),
    allowNull: false,
    required: true,
  },
  firstName: {
    type: Sequelize.STRING(50),
    allowNull: false,
    required: true,
  },
  lastName: {
    type: Sequelize.STRING(50),
    allowNull: false,
    required: true,
  },
  phone: {
    type: Sequelize.STRING(50),
    allowNull: false,
    required: true,
  },
},
{
  tableName: 'Users',
});


UsersModel.hasOne(AuthData, { foreignKey: 'UserId', as: 'authData' });
AuthData.belongsTo(UsersModel, { foreignKey: 'UserId', as: 'user' });

exports.Users = UsersModel; // eslint-disable-line no-undef