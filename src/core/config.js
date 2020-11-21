// Config wrapper to separate concerns

import fs from "fs";
import path from "path";

const configPath = path.join(__dirname, "../../config/default.json")

class Config {
  constructor() {
    const data = fs.readFileSync(configPath);

    this.config = JSON.parse(data);
  }

  get(id) {
    // Doesn't allow access to nested objects, could add nesting by using . as a split character.
    return this.config[id];
  }
}

export default new Config();