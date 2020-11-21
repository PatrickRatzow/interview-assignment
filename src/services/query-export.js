import pool from "../core/database-pool";
import fs from "fs";
import path from "path";
import bufferReplace from "buffer-replace";
import { verifyChecksum } from "./checksum";

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
      let name = field.trim()
      let alias;

      // Deal with AS alias
      const asAliasMatch = /AS ([\w]*)/ig.exec(name);
      if (asAliasMatch != null) {
        alias = asAliasMatch[1];
      }
      // Deal with space alias
      const spaceAliasSplit = name.split(" ")
      if (alias === undefined && spaceAliasSplit.length > 1) {
        alias = spaceAliasSplit[1];
      }

      if (alias === undefined) {
        alias = name;
      }

      // Remove everything we don't want
      name = name.split(" ")[0];

      fields.push({
        name,
        alias
      })
    }

    return fields
  }

  async getRowsCount(conn) {
    const [rows] = await conn.execute(`SELECT COUNT(*) AS rowsCount FROM ${this.getTarget()}`);

    return rows[0].rowsCount;
  }

  async getChecksum(conn) {
    const fields = this.getFields();
    await conn.execute("SET SESSION group_concat_max_len = 10000000");
    const query = `SELECT MD5(GROUP_CONCAT(CONCAT_WS(',', ${fields.map(field => field.name)}))) AS checksum FROM ${this.getTarget()}`;
    const [rows] = await conn.execute(query);

    return rows[0].checksum;
  }

  async isDataValid(checksum) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(`${outputPath}/export.csv`);
      let chunkPos = 0;
      const chunks = [];
      stream.on("data", (chunk) => {
        if (chunkPos == 0) {
          const firstLine = chunk.indexOf("\n")
          // Remove the header when we read this
          chunk = chunk.slice(firstLine + 1);
        }
        // Remove all newlines to match MySQL's MD5 output
        chunk = bufferReplace(chunk, "\n", ",");

        chunks.push(chunk);

        chunkPos++
      })
      stream.on("end", () => {
        let data = Buffer.concat(chunks);
        data = data.slice(0, data.length - 1);
        const isIntegral = verifyChecksum(checksum, data);

        resolve(isIntegral);
      })
    })
  }

  async exportToFile(chunkSize = 5) {
    // Acquire connection from pool
    const conn = await pool.getConnection();

    // Start transaction
    await conn.beginTransaction();

    const rowsCount = await this.getRowsCount(conn);
    if (rowsCount > 0) {
      // Find out how many chunks we need
      const chunks = Math.ceil(rowsCount / chunkSize);
      // Create the query we will be using
      const chunkQuery = `${this.query} LIMIT ? OFFSET ?`
      // Create stream to avoid having to use JSON, heavily reducing memory usage
      const stream = fs.createWriteStream(`${outputPath}/export.csv`)
      // Write a header with all the field names
      stream.write(`${this.getFields().map(field => field.alias).join(",")}\n`)

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
    
    const checksum = await this.getChecksum(conn);
    const isDataValid = await this.isDataValid(checksum);

    if (isDataValid) {
      // If valid we'll delete + commit the transction
      await conn.execute(`DELETE FROM ${this.getTarget()}`);
      
      await conn.commit();
    } else {
      // Technically no reason to rollback, but might be handy in the future if something changes.
      await conn.rollback();
    }

    // Release the connection back to the pool
    await conn.release();
  }
}