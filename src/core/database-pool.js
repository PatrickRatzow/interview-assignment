import mysql from "mysql2/promise";
import config from "./config";

// Singleton-ish pattern
export default mysql.createPool(config.get("database"));
