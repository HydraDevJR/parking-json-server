const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Body parser
server.use(jsonServer.bodyParser);

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

// ========== RUTAS PERSONALIZADAS (SIEMPRE ANTES DEL ROUTER) ==========
server.get('/celdas/resumen', (req, res) => {
  const db = router.db;
  const celdas = db.get('celdas').value();
  const total = celdas.length;
  const ocupadas = celdas.filter(c => c.ocupada === true).length;
  const disponibles = total - ocupadas;
  res.json({ total, ocupadas, disponibles });
});

server.get('/estadias/activas/count', (req, res) => {
  const db = router.db;
  const activas = db.get('estadias').filter(e => e.estado === 'activa').value().length;
  res.json({ count: activas });
});

server.get('/estadias/ingresos/hoy', (req, res) => {
  const db = router.db;
  const hoy = new Date().toISOString().slice(0, 10);
  const ingresos = db.get('estadias')
    .filter(e => e.estado === 'finalizada' && e.horaSalida && e.horaSalida.slice(0, 10) === hoy)
    .sumBy('valorPagado');
  res.json({ ingresos: ingresos || 0 });
});

server.get('/estadias/ingresos/mes', (req, res) => {
  const db = router.db;
  const mesActual = new Date().toISOString().slice(0, 7);
  const ingresos = db.get('estadias')
    .filter(e => e.estado === 'finalizada' && e.horaSalida && e.horaSalida.slice(0, 7) === mesActual)
    .sumBy('valorPagado');
  res.json({ ingresos: ingresos || 0 });
});

server.get('/estadias/recientes', (req, res) => {
  const db = router.db;
  const limit = parseInt(req.query.limit) || 5;
  const recientes = db.get('estadias')
    .orderBy(['horaEntrada'], ['desc'])
    .take(limit)
    .value();
  res.json(recientes);
});

// Ruta de prueba
server.get('/test', (req, res) => {
  res.json({ ok: true, message: 'Servidor funcionando' });
});

// ========== ROUTER POR DEFECTO (DEBE IR AL FINAL) ==========
server.use(router);

server.listen(process.env.PORT || 3000, () => {
  console.log(`✅ JSON Server corriendo en puerto ${process.env.PORT || 3000}`);
});