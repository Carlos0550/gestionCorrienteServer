const mysql = require("mysql")

const connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "joyeria"
});

connection.connect((err)=>{
    if (err) {
        console.log("error connecting: " + err.stack);
        return
    }
    console.log("connected as id " + connection.threadId);
});

module.exports = connection
