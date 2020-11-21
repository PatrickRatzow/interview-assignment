import mysql from "mysql2/promise";
import config from "../util/config";

class Connection {
  async connect() {
    if (this.connection !== undefined)
      throw new Error("Connection already established");

    const credentials = config.get("database");
    const connection = await mysql.createConnection(credentials);

    this.connection = connection;
  }

  async execute(query, params) {
    return this.connection.execute(query, [...params]);
  }
}

export default new Connection();