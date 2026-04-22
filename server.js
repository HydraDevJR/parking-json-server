const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

server.use(middlewares);

// ========== RUTAS PERSONALIZADAS ==========

// 1. POST /estadias - Crear una nueva estadía (entrada)
server.post('/estadias', (req, res) => {
  const db = router.db;
  const { placa, tipoVehiculo, celda, horaEntrada } = req.body;

  if (!placa || !horaEntrada) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: placa, horaEntrada' });
  }

  // Buscar o crear el vehículo
  let vehiculo = db.get('vehiculos').find({ placa: placa.toUpperCase() }).value();
  if (!vehiculo) {
    const newId = db.get('vehiculos').value().length + 1;
    vehiculo = {
      id: newId,
      placa: placa.toUpperCase(),
      tipo: tipoVehiculo || 'carro',
      usuarioId: null,   // opcional, se puede asignar después
      propietario: null
    };
    db.get('vehiculos').push(vehiculo).write();
  }

  // Asignar celda: si el usuario envió una, verificar que exista y esté disponible
  let celdaAsignada = null;
  if (celda) {
    const celdaEncontrada = db.get('celdas').find({ codigo: celda }).value();
    if (celdaEncontrada && !celdaEncontrada.ocupada) {
      celdaAsignada = celdaEncontrada;
    }
  }
  // Si no se envió celda o la enviada no está disponible, buscar una celda libre del mismo tipo
  if (!celdaAsignada) {
    const tipoVeh = tipoVehiculo || 'carro';
    celdaAsignada = db.get('celdas').find({ tipo: tipoVeh, ocupada: false }).value();
  }
  if (!celdaAsignada) {
    return res.status(409).json({ error: 'No hay celdas disponibles para este tipo de vehículo' });
  }

  // Marcar la celda como ocupada
  db.get('celdas').find({ id: celdaAsignada.id }).assign({ ocupada: true }).write();

  // Crear la estadía
  const nuevasEstadias = db.get('estadias').value();
  const newId = nuevasEstadias.length + 1;
  const nuevaEstadia = {
    id: newId,
    vehiculoId: vehiculo.id,
    placa: vehiculo.placa,
    celdaId: celdaAsignada.id,
    horaEntrada: new Date(horaEntrada).toISOString(),
    horaSalida: null,
    valorPagado: null,
    estado: 'activa'
  };
  db.get('estadias').push(nuevaEstadia).write();

  res.status(201).json(nuevaEstadia);
});

// 2. GET /celdas/resumen
server.get('/celdas/resumen', (req, res) => {
  const db = router.db;
  const celdas = db.get('celdas').value();
  const total = celdas.length;
  const ocupadas = celdas.filter(c => c.ocupada === true).length;
  const disponibles = total - ocupadas;
  res.json({ total, ocupadas, disponibles });
});

// 3. GET /estadias/activas/count
server.get('/estadias/activas/count', (req, res) => {
  const db = router.db;
  const activas = db.get('estadias').filter(e => e.estado === 'activa').value().length;
  res.json({ count: activas });
});

// 4. GET /estadias/ingresos/hoy
server.get('/estadias/ingresos/hoy', (req, res) => {
  const db = router.db;
  const hoy = new Date().toISOString().slice(0, 10);
  const ingresos = db.get('estadias')
    .filter(e => e.estado === 'finalizada' && e.horaSalida && e.horaSalida.slice(0, 10) === hoy)
    .sumBy('valorPagado');
  res.json({ ingresos: ingresos || 0 });
});

// 5. GET /estadias/ingresos/mes
server.get('/estadias/ingresos/mes', (req, res) => {
  const db = router.db;
  const mesActual = new Date().toISOString().slice(0, 7);
  const ingresos = db.get('estadias')
    .filter(e => e.estado === 'finalizada' && e.horaSalida && e.horaSalida.slice(0, 7) === mesActual)
    .sumBy('valorPagado');
  res.json({ ingresos: ingresos || 0 });
});

// 6. GET /estadias/recientes - Ahora incluye activas y finalizadas, ordenadas por horaEntrada
server.get('/estadias/recientes', (req, res) => {
  const db = router.db;
  const limit = parseInt(req.query.limit) || 5;
  const recientes = db.get('estadias')
    .orderBy(['horaEntrada'], ['desc'])
    .take(limit)
    .value();
  res.json(recientes);
});

// ========== ROUTER POR DEFECTO (siempre al final) ==========
server.use(router);

server.listen(process.env.PORT || 3000, () => {
  console.log(`JSON Server corriendo en el puerto ${process.env.PORT || 3000}`);
});