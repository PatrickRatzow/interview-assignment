import pool from "../core/database-pool";
import fs from "fs";
import path from "path";

const outputPath = path.join(__dirname, "../../output")

export default class QueryExport {
  constructor(query) {
    this.query = query;
  }

  getTarget() {
    // Find the last "from "
    const { index } = /(\bfrom \b)(?!.*\1)/ig.exec(this.query);
    // Take everything after the last FROM.
    // This has it's issues, but for now it'll do
    const target = this.query.substring(index + "FROM ".length)

    return target
  }

  getFields() {
    const fields = []

    const [, match] = /SELECT ([\s\S]*) FROM/ig.exec(this.query);
    // TODO: This could be done smarter with a regex. Doesn't support nested queries
    const split = match.split(",")
    for (const field of split) {
      const str = field.trim()
      let name;

      // Deal with AS alias
      const asAliasMatch = /AS ([\w]*)/ig.exec(str);
      if (asAliasMatch != null) {
        name = asAliasMatch[1];
      }
      // Deal with space alias
      const spaceAliasSplit = str.split(" ")
      if (name === undefined && spaceAliasSplit.length > 1) {
        name = spaceAliasSplit[1];
      }

      if (name === undefined) {
        name = str;
      }

      fields.push(name);
    }

    return fields
  }

  getCountQuery() {
    return `SELECT COUNT(*) AS rowsCount FROM ${this.getTarget()}`;
  }

  async exportToFile(chunkSize = 5) {
    // Acquire connection from pool
    const conn = await pool.getConnection();

    // Start transaction
    await conn.beginTransaction();

    const countQuery = this.getCountQuery(this.query);
    const [countRows] = await conn.execute(countQuery);
    const rowsCount= countRows[0]?.rowsCount;
    if (rowsCount > 0) {
      // Find out how many chunks we need
      const chunks = Math.ceil(rowsCount / chunkSize);
      // Create the query we will be using
      const chunkQuery = `${this.query} LIMIT ? OFFSET ?`
      // Create stream to avoid having to use JSON, heavily reducing memory usage
      const stream = fs.createWriteStream(`${outputPath}/export.csv`)
      // Write a header with all the field names
      stream.write(`${this.getFields().join(",")}\n`)
      
      for (let i = 0; i < chunks; i++) {
        const offset = i * chunkSize;
        const [rows] = await conn.execute(chunkQuery, [chunkSize, offset]);

        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          const rowStr = Object.values(row).join(",")

          stream.write(`${rowStr}\n`);
        }
      }

      // Finish file
      stream.end();
    }

    await conn.commit();

    // We're finished, release the connection back to the pool
    await conn.release();
  }
}