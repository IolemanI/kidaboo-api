import Sequelize from 'sequelize';
import { env } from './env';
import hierarchy from 'sequelize-hierarchy';

Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
    date = this._applyTimezone(date, options)
    return date.format('YYYY-MM-DD HH:mm:ss.SSS')
}

const db = new Sequelize({
    dialect: env.DB_TYPE,
    logging: false,
    dialectOptions: {
        decimalNumbers: true,
        trustedConections: true,
        connectionString: "Data Source=localhost;Initial Catalog=ECV2-LIVE;Integrated Security=True",
    },
    define: {
        timestamps: false
    },
    pool: {
        min: 0,
        max: 5,
        idle: 20000,
        acquire: 20000
    },

    port: +env.DB_PORT,
    host: env.DB_HOSTNAME,
    username: env.DB_USERNAME,
    password: '' + env.DB_PASSWORD,
    database: env.DB_DATABASE,

    timezone: '+00:00'
});
hierarchy(Sequelize);

export default db;

export async function initConnection() {
    db.authenticate()
      .then(() => {
        console.log('Connection has been established successfully.');
      })
      .catch(err => {
        console.error('Unable to connect to the database:', err);
      });
}

export async function syncDB() {
  db.sync()
    .then(() => {
      console.log('DB sync successfully');
    })
    .catch((err) => {
      console.log('DB sync error', err);
    });
}
