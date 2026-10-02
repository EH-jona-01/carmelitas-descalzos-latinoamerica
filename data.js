// Datos de ejemplo para la demo. Nada de esto es información real de la Orden.

const COUNTRIES = [
  { code: 'MX', name: 'México', dial: '+52', currency: 'MXN', rate: 18, tz: 'America/Mexico_City', provider: 'Mercado Pago', cities: ['Ciudad de México', 'Guadalajara', 'Puebla'] },
  { code: 'GT', name: 'Guatemala', dial: '+502', currency: 'GTQ', rate: 7.7, tz: 'America/Guatemala', provider: 'dLocal', cities: ['Ciudad de Guatemala', 'Quetzaltenango'] },
  { code: 'SV', name: 'El Salvador', dial: '+503', currency: 'USD', rate: 1, tz: 'America/El_Salvador', provider: 'dLocal', cities: ['San Salvador', 'Santa Ana'] },
  { code: 'HN', name: 'Honduras', dial: '+504', currency: 'HNL', rate: 26, tz: 'America/Tegucigalpa', provider: 'dLocal', cities: ['Tegucigalpa', 'San Pedro Sula'] },
  { code: 'NI', name: 'Nicaragua', dial: '+505', currency: 'NIO', rate: 37, tz: 'America/Managua', provider: 'dLocal', cities: ['Managua', 'León'] },
  { code: 'CR', name: 'Costa Rica', dial: '+506', currency: 'CRC', rate: 510, tz: 'America/Costa_Rica', provider: 'dLocal', cities: ['San José', 'Cartago'] },
  { code: 'PA', name: 'Panamá', dial: '+507', currency: 'USD', rate: 1, tz: 'America/Panama', provider: 'dLocal', cities: ['Ciudad de Panamá', 'David'] },
  { code: 'CU', name: 'Cuba', dial: '+53', currency: 'CUP', rate: 120, tz: 'America/Havana', provider: null, cities: ['La Habana', 'Santiago de Cuba'] },
  { code: 'DO', name: 'República Dominicana', dial: '+1', currency: 'DOP', rate: 62, tz: 'America/Santo_Domingo', provider: 'dLocal', cities: ['Santo Domingo', 'Santiago de los Caballeros'] },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', currency: 'USD', rate: 1, tz: 'America/Puerto_Rico', provider: 'Stripe', cities: ['San Juan', 'Ponce'] },
  { code: 'CO', name: 'Colombia', dial: '+57', currency: 'COP', rate: 4000, tz: 'America/Bogota', provider: 'Mercado Pago', cities: ['Bogotá', 'Medellín', 'Cali'] },
  { code: 'VE', name: 'Venezuela', dial: '+58', currency: 'USD', rate: 1, tz: 'America/Caracas', provider: 'dLocal', cities: ['Caracas', 'Maracaibo'] },
  { code: 'EC', name: 'Ecuador', dial: '+593', currency: 'USD', rate: 1, tz: 'America/Guayaquil', provider: 'dLocal', cities: ['Quito', 'Guayaquil'] },
  { code: 'PE', name: 'Perú', dial: '+51', currency: 'PEN', rate: 3.6, tz: 'America/Lima', provider: 'Mercado Pago', cities: ['Lima', 'Arequipa', 'Cusco'] },
  { code: 'BO', name: 'Bolivia', dial: '+591', currency: 'BOB', rate: 6.9, tz: 'America/La_Paz', provider: 'dLocal', cities: ['La Paz', 'Cochabamba'] },
  { code: 'CL', name: 'Chile', dial: '+56', currency: 'CLP', rate: 950, tz: 'America/Santiago', provider: 'Mercado Pago', cities: ['Santiago', 'Valparaíso'] },
  { code: 'AR', name: 'Argentina', dial: '+54', currency: 'ARS', rate: 1400, tz: 'America/Argentina/Buenos_Aires', provider: 'Mercado Pago', cities: ['Buenos Aires', 'Córdoba', 'Mendoza'] },
  { code: 'UY', name: 'Uruguay', dial: '+598', currency: 'UYU', rate: 40, tz: 'America/Montevideo', provider: 'Mercado Pago', cities: ['Montevideo', 'Salto'] },
  { code: 'PY', name: 'Paraguay', dial: '+595', currency: 'PYG', rate: 7500, tz: 'America/Asuncion', provider: 'dLocal', cities: ['Asunción', 'Encarnación'] },
];

const COMMUNITY_TYPES = ['Convento', 'Parroquia', 'Monasterio', 'Grupo OCDS'];

const COMMUNITY_NAMES = {
  'Convento': 'Convento del Carmen',
  'Parroquia': 'Parroquia Nuestra Señora del Carmen',
  'Monasterio': 'Monasterio de San José',
  'Grupo OCDS': 'Grupo OCDS Santa Teresa',
};

// Genera comunidades de ejemplo: una por ciudad, rotando el tipo.
function buildCommunities() {
  const list = [];
  COUNTRIES.forEach((country, ci) => {
    country.cities.forEach((city, i) => {
      const type = COMMUNITY_TYPES[(ci + i) % COMMUNITY_TYPES.length];
      list.push({
        id: `${country.code}-${i}`,
        country: country.code,
        city,
        type,
        name: COMMUNITY_NAMES[type],
        schedule: type === 'Grupo OCDS' ? 'Reunión: sábados 10:00' : 'Misa: lun a sáb 8:00 · dom 11:00',
        distanceKm: Number((1.2 + ((ci * 7 + i * 3) % 9) * 0.8).toFixed(1)),
      });
    });
  });
  return list;
}

const COMMUNITIES = buildCommunities();

// Fiestas carmelitas (mes-día).
const FEASTS = [
  { md: '05-25', name: 'Santa María Magdalena de Pazzi' },
  { md: '07-13', name: 'Santa Teresa de los Andes' },
  { md: '07-16', name: 'Nuestra Señora del Monte Carmelo' },
  { md: '08-09', name: 'Santa Teresa Benedicta de la Cruz' },
  { md: '10-01', name: 'Santa Teresa del Niño Jesús' },
  { md: '10-15', name: 'Santa Teresa de Jesús' },
  { md: '11-08', name: 'Santa Isabel de la Trinidad' },
  { md: '11-14', name: 'Todos los Santos de la Orden' },
  { md: '12-14', name: 'San Juan de la Cruz' },
];

// Lecturas de ejemplo: en la app real vienen del calendario litúrgico.
const READINGS = [
  {
    ref: 'Mateo 11, 28-30',
    text: 'Vengan a mí todos los que están cansados y agobiados, y yo los aliviaré. Carguen con mi yugo y aprendan de mí, que soy paciente y humilde de corazón, y encontrarán descanso.',
    prayer: 'Señor, hoy te entrego lo que me pesa. Enséñame a descansar en ti.',
  },
  {
    ref: 'Juan 15, 4-5',
    text: 'Permanezcan en mí, como yo permanezco en ustedes. Yo soy la vid, ustedes los sarmientos. El que permanece en mí y yo en él, da mucho fruto.',
    prayer: 'Jesús, que hoy no me separe de ti en nada de lo que haga.',
  },
  {
    ref: 'Mateo 6, 6',
    text: 'Tú, cuando ores, entra en tu cuarto, cierra la puerta y ora a tu Padre, que está en lo secreto. Y tu Padre, que ve en lo secreto, te recompensará.',
    prayer: 'Padre, dame un rato de silencio contigo, como un amigo con su amigo.',
  },
  {
    ref: 'Lucas 10, 41-42',
    text: 'Marta, Marta, te inquietas y te agitas por muchas cosas; y hay necesidad de pocas, o mejor, de una sola. María eligió la mejor parte, y no le será quitada.',
    prayer: 'Señor, ordena mi día para que lo primero seas tú.',
  },
];

const QUOTES = [
  { text: 'Nada te turbe, nada te espante, todo se pasa, Dios no se muda; la paciencia todo lo alcanza; quien a Dios tiene nada le falta: solo Dios basta.', author: 'Santa Teresa de Jesús' },
  { text: 'A la tarde te examinarán en el amor.', author: 'San Juan de la Cruz' },
  { text: 'Para mí, la oración es un impulso del corazón, una sencilla mirada lanzada hacia el cielo.', author: 'Santa Teresa del Niño Jesús' },
];

const PRAYERS = [
  { id: 'p1', title: 'Evangelio orado del día', minutes: 8, kind: 'Audio y texto' },
  { id: 'p2', title: 'Oración de la mañana', minutes: 5, kind: 'Audio' },
  { id: 'p3', title: 'Lectio divina guiada', minutes: 15, kind: 'Audio y texto' },
  { id: 'p4', title: 'Rosario meditado', minutes: 20, kind: 'Audio' },
  { id: 'p5', title: 'Examen de la noche', minutes: 6, kind: 'Texto' },
];

// Usuarios por país para el panel (datos de ejemplo).
const SAMPLE_USERS_BY_COUNTRY = {
  MX: 412, CO: 238, AR: 176, PE: 141, CL: 98, EC: 64, GT: 52, DO: 47, VE: 44, BO: 31,
  CR: 28, PY: 22, SV: 19, HN: 17, UY: 15, PA: 13, PR: 11, NI: 9, CU: 4,
};

const SAMPLE_PENDING = [
  { id: 'u-demo-1', name: 'María Fernanda López', country: 'MX', community: 'MX-0', group: 'Grupo OCDS' },
  { id: 'u-demo-2', name: 'Juan Pablo Ríos', country: 'CO', community: 'CO-1', group: 'Grupo de oración' },
  { id: 'u-demo-3', name: 'Lucía Benítez', country: 'AR', community: 'AR-2', group: 'Grupo OCDS' },
];
