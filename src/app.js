import QueryExport from "./services/query-export";

(async () => {
  const queryExport = new QueryExport("users", "SELECT id u, firstName AS n2, lastName, email FROM users u");
  const success = await queryExport.exportToFile();

  console.log(success ? "It worked!" : "It wasn't able to export this query :\\");
})();