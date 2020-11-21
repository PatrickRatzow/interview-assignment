import QueryExport from "./services/query-export";

(async () => {
  const queryExport = new QueryExport();
  await queryExport.exportToFile("SELECT id, firstName, lastName, email FROM users");
})();