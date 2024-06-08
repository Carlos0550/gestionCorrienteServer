const mysql = require("mysql2");
const { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, DB_PORT } = require("./config.js");

let connection;

// Función para conectar inicialmente y manejar reconexiones
function connectDatabase() {
  connection = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    database: DB_NAME,
    multipleStatements: true // Permite ejecutar múltiples declaraciones en una sola consulta
  });

  // Conectar a la base de datos
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to database:", err.stack);
      setTimeout(connectDatabase, 2000); // Intentar reconectar después de 2 segundos
    } else {
      console.log("Connected to database");
    }
  });

  // Manejar errores de conexión perdida
  connection.on('error', (err) => {
    console.error('Database error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      connectDatabase(); // Reconectar si se pierde la conexión
    } else {
      throw err;
    }
  });
}

// Llamar a la función para conectar inicialmente
connectDatabase();

module.exports = connection;
