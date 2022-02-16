import { ConnectionOptions } from "typeorm";
import * as PostgressConnectionStringParser from "pg-connection-string";

const connectionOptions = PostgressConnectionStringParser.parse(
  process.env.PG_CONNECTION_STRING + ""
);

const config: ConnectionOptions = {
  type: "postgres",
  host: connectionOptions.host + "",
  port: parseInt(connectionOptions.port + ""),
  username: connectionOptions.user,
  password: connectionOptions.password,
  database: connectionOptions.database + "",
  synchronize: true,

  entities: [__dirname + "/../**/*.entity.{js,ts}"],
  migrations: [__dirname + "/migrations/*.ts"],

  cli: {
    migrationsDir: __dirname + "/migrations",
  },
  ssl: { rejectUnauthorized: false },
};

export default config;
