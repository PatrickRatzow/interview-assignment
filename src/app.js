import QueryExport from "./services/query-export";

function printUsageHelp() {
  console.error("Invalid input! You need to supply two arguments")
  console.error("npm run start <file name> <sql query>")
}

(async () => {
  const args = process.argv.slice(2);
  const fileName = args[0];
  const query = args[1];
  if (fileName === undefined || query === undefined) {
    printUsageHelp();

    process.exit(0);
  }

  const queryExport = new QueryExport(fileName, query);
  const { success, msg }= await queryExport.exportToFile();

  if (success) {
    console.log(msg);
  } else {
    console.error(msg);
  }
})();