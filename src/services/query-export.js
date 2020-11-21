import pool from "../core/database-pool";
import fs from "fs";
import path from "path";
import { verifyChecksum } from "./checksum";

const outputPath = path.join(__dirname, "../../output")

export default class QueryExport {
  constructor(name, query) {
    // Try to sanitize it the best we quickly can do.
    this.name = name.toLowerCase().replace(/ /g, "_")
    if (!/^[a-z0-9_]*$/g.test(this.name) || !this.name.length) {
      throw new Error("Only alphanumeric names are allowed!");
    }
    this.query = query;
  }

  getFilePath() {
    return `${outputPath}/${this.name}.csv`
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
    await conn.execute("SET SESSION group_concat_max_len = 1000000000");
    const query = `SELECT MD5(GROUP_CONCAT(CONCAT_WS(',', ${fields.map(field => field.name)}) SEPARATOR '\n')) AS checksum FROM ${this.getTarget()}`;
    const [rows] = await conn.execute(query);

    return rows[0].checksum;
  }

  async isDataValid(checksum) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.getFilePath());
      let chunkPos = 0;
      const chunks = [];
      stream.on("data", (chunk) => {
        if (chunkPos === 0) {
          const firstLine = chunk.indexOf("\n")
          // Remove the header when we read this
          chunk = chunk.slice(firstLine + 1);
        }

        chunks.push(chunk);
        
        chunkPos++
      })
      stream.on("end", () => {
        let data = Buffer.concat(chunks);
        data = data.slice(0, data.length - 1);
        const isIntegral = verifyChecksum(checksum, data.toString());

        resolve(isIntegral);
      })
    })
  }

  async exportToFile(options = {}) {
    const chunkSize = options.chunkSize || 10000;
    const deleteRows = (options.deleteRows === true || options.deleteRows === undefined) ? true : false;
    
    // Acquire connection from pool
    const conn = await pool.getConnection();

    // Setup database isolation level
    await conn.execute("SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    // Start transaction
    await conn.beginTransaction();

    const rowsCount = await this.getRowsCount(conn);
    if (rowsCount === 0) {
      // No rows to handle, just return
      await conn.rollback();
      conn.release();

      return {
        success: false,
        msg: "No rows to process"
      }
    }
    
    // Find out how many chunks we need
    const chunks = Math.ceil(rowsCount / chunkSize);
    // Create the query we will be using
    const chunkQuery = `${this.query} LIMIT ? OFFSET ?`
    // Create stream to avoid having to use JSON, heavily reducing memory usage
    const path = this.getFilePath();
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
    const stream = fs.createWriteStream(path);
    // Write a header with all the field names
    stream.write(`${this.getFields().map(field => field.alias || field.name).join(",")}\n`)
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

    const checksum = await this.getChecksum(conn);
    const isDataValid = await this.isDataValid(checksum);

    if (isDataValid) {
      // If valid we'll delete + commit the transction

      // Option here, as we don't want to delete rows when testing if we're dealing with a huge table
      if (deleteRows) {
        await conn.execute(`DELETE FROM ${this.getTarget()}`);
      }
      
      await conn.commit();
    } else {
      // Technically no reason to rollback, but might be handy in the future if something changes.
      await conn.rollback();
    }

    // Release the connection back to the pool
    conn.release();

    return {
      success: isDataValid,
      msg: isDataValid
        ? "Exported query data to a local file, and validated the data integrity of said file"
        : "Data integrity check failed, rolling back changes"
    }
  }
}