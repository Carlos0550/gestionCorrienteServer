const express = require('express');
const cors = require('cors');
const db = require('./db');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const upload = multer();
const {PORT} = require("./config.js")


app.use(cors({
  origin: '*'
}));
app.use(bodyParser.json()); //para apps json
app.use(bodyParser.urlencoded({ extended: true })); // Middleware para parsear application/x-www-form-urlencoded




app.get("/", (req, res) => {
  res.send("Server Running")
});

function randomID() {
  return Math.random().toString(14).substr(2, 9)
}

app.post("/api/clients/create", async (req, res) => {
  const { nombre, apellido, email, dni, telefono, direccion } = req.body;
  const idDeudor = randomID();

  const checkUserQuery = `SELECT COUNT(*) AS count FROM usuarios WHERE dni = ?`;
  const insertUserQuery = `INSERT INTO usuarios (nombre, apellido, email, dni, telefono, direccion, id_deudor) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  try {
    const [results] = await db.query(checkUserQuery, [dni]);
    const count = results[0].count;

    if (count > 0) {
      return res.status(409).send('Error, ya existe un usuario con ese DNI!');
    }

    await db.query(insertUserQuery, [nombre, apellido, email, dni, telefono, direccion, idDeudor]);

    res.status(201).send('Usuario creado correctamente');
  } catch (error) {
    console.error('Error al procesar la solicitud', error);
    res.status(500).send('Error interno del servidor');
  }
});



app.post("/api/clients/find", async (req, res) => {
  const { nombre, apellido, dni } = req.body;
  let query;
  let params;

  if (nombre) {
    query = `SELECT * FROM usuarios WHERE nombre = ?`;
    params = [nombre];
  } else if (apellido) {
    query = `SELECT * FROM usuarios WHERE apellido = ?`;
    params = [apellido];
  } else if (dni) {
    query = `SELECT * FROM usuarios WHERE dni = ?`;
    params = [dni];
  } else {
    return res.status(400).send('Debe proporcionar nombre, apellido o dni para la búsqueda.');
  }

  try {
    const [results] = await db.query(query, params);

    if (results.length === 0) {
      return res.status(404).send("No se encontraron usuarios con el criterio proporcionado.");
    }

    res.status(200).json(results);
  } catch (err) {
    console.error("Error al buscar usuario:", err);
    res.status(500).send("Error interno del servidor");
  }
});

app.post("/api/clients/retrieveDebtCustomer", async (req, res) => {
  const { idDeudor } = req.body;
  console.log(req.body);

  const query = `SELECT * FROM adeudamiento WHERE id_usuario = ?`;

  try {
    const [result] = await db.query(query, [idDeudor]);

    if (result.length === 0) {
      console.log("No se encontraron resultados para idDeudor:", idDeudor);
      return res.status(200).json([]); // Enviar un arreglo vacío si no hay resultados
    }

    res.status(200).json(result); // Enviar los resultados encontrados
  } catch (err) {
    console.error("Error al ejecutar la consulta:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/clients/getAllDebts", async (req, res) => {
  const query = `SELECT * FROM adeudamiento`;

  try {
    const [result] = await db.query(query);

    if (result.length === 0) {
      console.log("No se encontraron resultados");
      return res.status(200).json([]);
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Error al ejecutar la consulta:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.post("/api/clients/addDebt", async (req, res) => {
  try {
    console.log(req.body);
    const products = req.body.values;
    const nombreCompleto = req.body.nombreCompleto;

    for (let product of products) {
      const { nameProduct, price, arsOrUsd, quantity, date, id_deudor } = product;
      const query = `INSERT INTO adeudamiento (nombre_producto, precio_unitario, cantidad, fecha, moneda, id_usuario, nombre_completo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      await db.query(query, [nameProduct, price, quantity, date, arsOrUsd, id_deudor, nombreCompleto]);
    }

    res.status(201).json({ message: 'Deudas agregadas correctamente' });
  } catch (error) {
    console.error('Error al agregar deudas:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud' });
  }
});


app.delete("/api/clients/deleteIndividualDebt", async (req, res) => {
  const { idDelete } = req.body;
  if (!idDelete) {
    return res.status(400).json({ error: 'Debe proporcionar un ID de deuda' });
  }

  const query = `DELETE FROM adeudamiento WHERE id = ?`;

  try {
    const [result] = await db.query(query, [idDelete]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    res.status(200).json({ message: 'Deuda eliminada correctamente' });
  } catch (err) {
    console.error("Error al ejecutar consulta de eliminación:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.post("/api/clients/cancelarFichero", upload.none(), async (req, res) => {
  const data = req.body;
  const cliente = {
    id: data.id,
    nombre: data.nombre,
    apellido: data.apellido,
    dni: data.dni,
    id_usuario: data.id_deudor,
    fecha_cancelacion: data.fecha_cancelacion
  };
  console.log("Datos del cliente: ", cliente);

  const productos = Array.isArray(data.productos) ? data.productos : [];
  console.log("Productos: ", productos);

  const itemsToSave = productos.map(product => ({
    nombre_producto: product.nombre_producto,
    precio_unitario: product.precio_unitario,
    moneda: product.moneda,
    cantidad: product.cantidad,
    fecha: product.fecha_compra,
    nombre_completo: cliente.nombre,
    dni: cliente.dni,
    id_usuario: cliente.id_usuario,
    fecha_cancelacion: cliente.fecha_cancelacion
  }));
  console.log("Items a guardar:", itemsToSave);

  const insertRegistersQuery = `
    INSERT INTO registro_de_deudas 
    (nombre_producto, precio_producto, moneda, cantidad, fecha_compra, fecha_de_cancelacion, nombre_cliente, dni, id_cliente)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const deleteQueryAdeudamientos = `DELETE FROM adeudamiento WHERE id_usuario = ?`;
  const deleteQueryEntregas = `DELETE FROM entregas WHERE id_cliente_deudor = ?`;
  const deleteQueryListaDeEntregas = `DELETE FROM lista_de_entregas WHERE id_deudor = ?`;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const item of itemsToSave) {
      await connection.query(insertRegistersQuery, [
        item.nombre_producto,
        item.precio_unitario,
        item.moneda,
        item.cantidad,
        item.fecha,
        item.fecha_cancelacion,
        item.nombre_completo,
        item.dni,
        item.id_usuario
      ]);
    }

    await connection.query(deleteQueryAdeudamientos, [cliente.id_usuario]);
    console.log(`Registros de adeudamientos eliminados para idDeudor ${cliente.id_usuario}`);

    await connection.query(deleteQueryEntregas, [cliente.id_usuario]);
    console.log(`Registros de entregas eliminados para idDeudor ${cliente.id_usuario}`);

    await connection.query(deleteQueryListaDeEntregas, [cliente.id_usuario]);
    console.log(`Registros de lista_de_entregas eliminados para idDeudor ${cliente.id_usuario}`);

    await connection.commit();
    console.log("Transacción completada correctamente");
    res.status(200).json({ message: 'Fichero cancelado correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error("Error en la transacción:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
});

app.post('/api/clients/insertTotalPays', async (req, res) => {
  const { id_usuario, monto_entrega, fecha_entrega } = req.body.data;

  const checkQuery = `SELECT COUNT(*) AS count FROM entregas WHERE id_cliente_deudor = ?`;
  const insertQuery = `INSERT INTO entregas (monto_entrega, fecha_entrega, id_cliente_deudor) VALUES (?, ?, ?)`;
  const listaDeIntregasInsertQuery = `INSERT INTO lista_de_entregas (id_deudor, monto_entrega, fecha_entrega) VALUES (?, ?, ?)`;
  const fetchLastPayData = `SELECT monto_entrega FROM entregas WHERE id_cliente_deudor = ?`;
  const updateQuery = `UPDATE entregas SET monto_entrega = ?, fecha_entrega = ? WHERE id_cliente_deudor = ?`;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(checkQuery, [id_usuario]);

    const count = result[0].count;

    if (count === 0) {
      await connection.query(insertQuery, [monto_entrega, fecha_entrega, id_usuario]);
      await connection.query(listaDeIntregasInsertQuery, [id_usuario, monto_entrega, fecha_entrega]);
    } else {
      const [existingPayData] = await connection.query(fetchLastPayData, [id_usuario]);
      const montoExistente = parseFloat(existingPayData[0].monto_entrega || 0);
      const nuevoMonto = montoExistente + parseFloat(monto_entrega);

      await connection.query(updateQuery, [nuevoMonto, fecha_entrega, id_usuario]);
      await connection.query(listaDeIntregasInsertQuery, [id_usuario, monto_entrega, fecha_entrega]);
    }

    await connection.commit();
    res.status(200).json({ message: 'Datos actualizados correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error('Error en la transacción:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});




app.get("/api/clients/getTotalPays", async (req, res) => {
  const { id_deudor } = req.query;

  if (!id_deudor) {
    console.log("No se proporcionó un ID de deudor");
    return res.status(400).json({ error: 'No se proporcionó un ID de deudor válido' });
  }

  const query = `SELECT * FROM entregas WHERE id_cliente_deudor = ?`;

  try {
    const [results] = await db.query(query, [id_deudor]);
    console.log("Datos obtenidos");
    res.status(200).json(results);
  } catch (err) {
    console.error('Error en la consulta SQL:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.get("/api/clients/getRegisterPays", async (req, res) => {
  const { id_deudor } = req.query;

  if (!id_deudor) {
    console.log("No se proporcionó un ID de deudor");
    return res.status(400).json({ error: 'No se proporcionó un ID de deudor válido' });
  }

  const query = `SELECT * FROM lista_de_entregas WHERE id_deudor = ?`;

  try {
    const [result] = await db.query(query, [id_deudor]);
    console.log("Datos obtenidos");
    res.status(200).json(result);
  } catch (err) {
    console.error('Error en la consulta SQL:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



app.post("/api/clients/obtenerHistorialDelCliente", async (req, res) => {
  const { nombre, dni } = req.body;

  let query = '';
  let params = [];

  if (nombre) {
    query = `SELECT * FROM registro_de_deudas WHERE nombre_cliente = ?`;
    params.push(nombre);
  } else if (dni) {
    query = `SELECT * FROM registro_de_deudas WHERE dni = ?`;
    params.push(dni);
  } else {
    return res.status(400).json({ error: 'Debe proporcionar nombre o dni para la búsqueda.' });
  }

  try {
    const [result] = await db.query(query, params);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Este usuario no tiene historial de deudas' });
    }

    console.log(result);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error en la consulta SQL:', err);
    res.status(500).json({ error: 'No se pudo obtener el historial del usuario' });
  }
});
app.put("/api/clients/updateClientData", async (req, res) => {
  const { values, idDeudor } = req.body;
  console.log(idDeudor)
  // Verificar que idDeudor y otros campos necesarios están presentes
  if (!idDeudor || !values.nombre_completo || !values.apellido || !values.dni || !values.telefono || !values.correo || !values.direccion) {
    console.log("Todos los campos son requeridos");
    return res.status(400).send("Todos los campos son requeridos");
  }

  const updateQuery = `
    UPDATE usuarios 
    SET nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ?, direccion = ?
    WHERE id_deudor = ?                       
  `;

  try {
    const [result] = await db.execute(updateQuery, [
      values.nombre_completo, 
      values.apellido, 
      values.dni, 
      values.telefono, 
      values.correo, 
      values.direccion, 
      idDeudor
    ]);

    if (result.affectedRows === 0) {
      console.log("User not found")
      return res.status(404).send("Usuario no encontrado");
    }

    res.status(200).send("Datos actualizados correctamente");
    console.log("Operation succesfully")
  } catch (error) {
    console.error(error);
    res.status(500).send("Error actualizando datos");
  }
});
app.listen(PORT)
console.log(`SERVER ON PORT ${PORT}`)
