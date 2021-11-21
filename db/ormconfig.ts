import { ConnectionOptions } from "typeorm";

const config: ConnectionOptions = {
  type: "postgres",
  host: process.env.SQL_IP,
  port: 5432,
  username: process.env.SQL_USER, // databse login role username
  password: process.env.SQL_PASSWORD, // database login role password
  database: process.env.SQL_DATABASE, // db name

  entities: [__dirname + "/../**/*.entity.{js,ts}"],
  migrations: [__dirname + "/migrations/*.ts"],

  cli: {
    migrationsDir: __dirname + "/migrations",
  },
  synchronize: true,
};

export default config;
