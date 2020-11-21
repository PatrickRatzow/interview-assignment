import pool from "../core/database-pool";
import fs from "fs/promises";
import path from "path";

const outputPath = path.join(__dirname, "../../output")

export default class QueryExport {
  getCountQuery(query) {
    // Find the last "from "
    const { index } = /(\bfrom \b)(?!.*\1)/ig.exec(query);
    // Take everything after the last FROM.
    // This has it's issues, but for now it'll do
    const target = query.substring(index + "FROM ".length)

    return `SELECT COUNT(*) AS rowsCount FROM ${target}`
  }

  async exportToFile(query, chunkSize = 5) {
    // Acquire connection from pool
    const conn = await pool.getConnection();

    // Start transaction
    await conn.beginTransaction();

    const countQuery = this.getCountQuery(query);
    const [countRows] = await conn.execute(countQuery);
    const userCount = countRows[0]?.rowsCount;
    if (userCount > 0) {
      // Find out how many chunks we need
      const chunks = Math.ceil(userCount / chunkSize);
      // Create file and start JSON assembly
      await fs.writeFile(`${outputPath}/export.json`, "[\n");

      // TODO: Handle queries

      // Finish up the JSON file
      await fs.appendFile(`${outputPath}/export.json`, "]");
    }

    await conn.commit();

    // We're finished, release the connection back to the pool
    await conn.release();
  }
}