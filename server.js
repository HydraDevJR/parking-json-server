const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// 1. Body parser ANTES de cualquier ruta
server.use(jsonServer.bodyParser); // Para json-server
// O alternativamente: server.use(express.json()) pero jsonServer ya incluye bodyParser

// 2. CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 3. Middlewares por defecto (logger, static, etc.)
server.use(middlewares);

// ========== RUTAS PERSONALIZADAS ==========
server.post('/estadias', (req, res) => {
  console.log('📥 Body recibido:', req.body);
  const { placa, tipoVehiculo, celda, horaEntrada } = req.body;

  if (!placa || !horaEntrada) {
    return res.status(400).json({ error: 'Faltan campos: placa y horaEntrada' });
  }

  const db = router.db;

  // Buscar o crear vehículo
  let vehiculo = db.get('vehiculos').find({ placa: placa.toUpperCase() }).value();
  if (!vehiculo) {
    const newId = db.get('vehiculos').value().length + 1;
    vehiculo = {
      id: newId,
      placa: placa.toUpperCase(),
      tipo: tipoVehiculo || 'carro',
      usuarioId: null,
      propietario: null
    };
    db.get('vehiculos').push(vehiculo).write();
  }

  // Asignar celda
  let celdaAsignada = null;
  if (celda) {
    celdaAsignada = db.get('celdas').find({ codigo: celda, ocupada: false }).value();
  }
  if (!celdaAsignada) {
    const tipoVeh = tipoVehiculo || 'carro';
    celdaAsignada = db.get('celdas').find({ tipo: tipoVeh, ocupada: false }).value();
  }
  if (!celdaAsignada) {
    return res.status(409).json({ error: 'No hay celdas disponibles' });
  }

  // Marcar celda como ocupada
  db.get('celdas').find({ id: celdaAsignada.id }).assign({ ocupada: true }).write();

  // Crear estadía
  const newId = db.get('estadias').value().length + 1;
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

// ... resto de tus rutas (celdas/resumen, etc.)

server.use(router);

server.listen(process.env.PORT || 3000, () => {
  console.log(`JSON Server corriendo en puerto ${process.env.PORT || 3000}`);
});