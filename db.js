const mysql = require("mysql");
const {
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_USER,
    DB_PORT
}= require("./config.js");

const connection = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    database: DB_NAME
});

connection.connect((err)=>{
    if (err) {
        console.log("error connecting: " + err.stack);
        return
    }
    console.log("connected as id " + connection.threadId);
});

module.exports = connection
