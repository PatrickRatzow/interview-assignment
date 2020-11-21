import QueryExport from "./services/query-export";

(async () => {
  const queryExport = new QueryExport("SELECT id u, firstName AS n2, lastName, email FROM users u");
  await queryExport.exportToFile();
})();