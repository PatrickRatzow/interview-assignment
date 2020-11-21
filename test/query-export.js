import { expect } from "chai";
import QueryExport from "../src/services/query-export";

describe("QueryExport", () => {
  it("should succeed in fully exporting users table", async () => {
    const exporter = new QueryExport("users_full", "SELECT id, firstName, lastName, email FROM users");
    const { success } = await exporter.exportToFile({ deleteRows: false });

    expect(success).to.be.true;
  });
  it("should succeed in partially exporting users table", async () => {
    const exporter = new QueryExport("users_partial", "SELECT id, firstName, lastName FROM users");
    const { success } = await exporter.exportToFile({ deleteRows: false });

    expect(success).to.be.true;
  });
  it("should succeed in exporting users table when using space alias", async () => {
    const exporter = new QueryExport("users_space_alias", "SELECT id identifier, firstName, lastName FROM users");
    const { success } = await exporter.exportToFile({ deleteRows: false });

    expect(success).to.be.true;
  });
  it("should succeed in exporting users table when using space AS alias", async () => {
    const exporter = new QueryExport("users_as_alias", "SELECT id AS identifier, firstName, lastName FROM users");
    const { success } = await exporter.exportToFile({ deleteRows: false });

    expect(success).to.be.true;
  });
  it("should succeed in fully exporting mega_users table", async () => {
    const exporter = new QueryExport("mega_users", "SELECT id, firstName, lastName, email FROM mega_users");
    // Increase chunk size as we're dealing with a lot more data now
    const { success } = await exporter.exportToFile({ chunkSize: 200000, deleteRows: false });

    expect(success).to.be.true;
  }).timeout(1000 * 60 * 2); // 2 minutes
})