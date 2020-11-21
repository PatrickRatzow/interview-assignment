# Introduction
This is my solution for [this interview assignment](https://github.com/cego/interview-assignment) as a part of the job application.

## Setup
This is written in JavaScript using Node.js, and requires at least version 14.15.1 LTS of Node.js. On top of that MySQL 8.0+ is required as the database server. It might work with MariaDB, but it haven't been tested.

You will need to configure ```config/default.json``` to match your MySQL connection.

### Usage
To install the application you'll simply need to install all dependencies, which can be done by executing the following command
```shell
$ npm i # install
$ npm run build # build the application
```

Now you'll have to import ```users.sql``` and ```mega_users.sql``` into your database. These files can be found in the SQL directory.

Here's the commands you can then use
```shell
$ npm test # run the tests. doesn't delete the data set from database
$ npm run start <file name> <sql query> # run the built application
$ npm run dev <file name> <sql query> # run the development application
```

Once you've run the application, you'll be able to find your exported file in the output directory.

Example usage
```shell
$ npm run start "users_names" "SELECT firstName, lastName FROM users"
```

## Analysis
A quick run through my approach to this assignment, describing the thoughts I had.
### Problem
As the problem statement doesn't specify a concise query, we have to assume that any select query can be used. This complicates things drastically as we have to take account for a lot of extra things, and aren't able to use the same shortcuts compared to knowing the structure of the query. 

The columns of the query isn't predefined, therefore we need to include some kind of metadata in the output file. Without any metadata it'll be significantly harder to import our data files, as we would have to write down what parts of the file corresponds to what column elsewhere, which is counter productive.

We have to somehow make sure that the data matches, and it has to be fast. Comparison isn't necessarily cheap, especially not when you're checking a lot of data. This wouldn't really be a problem, if we only had to consider the SQL dump given in the assignment, but we also need to be able to handle much larger amounts of data.
### Solution
Scanning the query is needed, as we will be able to deduce important things from it like column names. We will also be able to reuse parts of the select query in our delete query. To make sure our queries don't get interrupted midway by another entity, a transaction with the isolation level of serializable will be used. As I imagine this will be used for database backups or such, maximum security is a must, and therefore phantom reads cannot be allowed to happen.

Using a CSV file reduces file size, as unlike other formats like XML or JSON we won't have to constantly repeat the column name. On top of that the implementation complexity is reduced, which completely justifies CSV over JSON. To incorporate some kind of metadata, the first line will be the column names in respective order. When validating an exported file, we will simply have to strip the first line.

When validating the file we will be using checksums from both parts, and just comparing them, instead of compairing the actual data. This drastically reduces the time complexity, and makes our comparison implementation versatile. To reduce our memory footprint, we will use buffered streams to write and read to the file. And to reduce the memory footprint even more, the select query will be split up into several chunks by using LIMIT and OFFSET.                                                                           
## Final considerations
The select query scanner is very basic, and it's not currently possible to use any select queries with nested queries, use *, or use OFFSET or LIMIT in the query.

Any column having an , or newline will immediately break the exporting, effectively rendering this useless. To prevent this you'd have to escape all of the values. Even with that done, if your query can contain null values they wont be represented by anything in the file, again breaking the file.

While there's still a lot of things that can be improved upon, I'm generally happy with the outcome. I was able to read a million rows from the database, write them to a file, read that file and check if the data matches, all in around 11.5 seconds when testing on my computer. Considering the use of a simple CSV file, 11.5 seconds is more than fast enough, and therefore I consider it satisfactory.
