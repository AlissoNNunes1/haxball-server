// Comando global de uniformes para todas as salas
// Logica centralizada para ser importada por commands.cjs

const DEFAULT_ANGLE = 60;
const DEFAULT_TEXT_COLOR = '#ffffff';
const COLOR_SIMILARITY_THRESHOLD = 90;

// Lista de uniformes: sigla+numero => dados
const UNIFORMS = {
  im1: {
    code: 'im1',
    name: 'Inter Miami',
    angle: 0,
    textColor: '#191919',
    colors: ['#ff5cc9', '#fa5f9d', '#ff5cc9'],
  },
  im2: {
    code: 'im2',
    name: 'Inter Miami',
    angle: 0,
    textColor: '#ff6675',
    colors: ['#333333', '#030102'],
  },
  ss1: {
    code: 'ss1',
    name: 'Seattle Sounders',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#00fc3b', '#11f079', '#00fc3b'],
  },
  ss2: {
    code: 'ss2',
    name: 'Seattle Sounders',
    angle: 90,
    textColor: '#4aafd4',
    colors: ['#031e33', '#114d66', '#031e33'],
  },
  laf1: {
    code: 'laf1',
    name: 'Los Angeles FC',
    angle: 0,
    textColor: '#875a2e',
    colors: ['#000000', '#e0964c', '#000000'],
  },
  laf2: {
    code: 'laf2',
    name: 'Los Angeles FC',
    angle: 0,
    textColor: '#de9d04',
    colors: ['#fffafa'],
  },
  mon1: {
    code: 'mon1',
    name: 'Monterrey',
    angle: 90,
    textColor: '#fffafa',
    colors: ['#fffafa', '#080847', '#fffafa'],
  },
  mon2: {
    code: 'mon2',
    name: 'Monterrey',
    angle: 90,
    textColor: '#1212a3',
    colors: ['#080847', '#fffafa', '#080847'],
  },
  pac1: {
    code: 'pac1',
    name: 'Pachuca',
    angle: 0,
    textColor: '#dbd8d8',
    colors: ['#f7f3f3', '#1231ff', '#f7f3f3'],
  },
  pac2: {
    code: 'pac2',
    name: 'Pachuca',
    angle: 0,
    textColor: '#fffcfc',
    colors: ['#000000', '#090f45', '#000000'],
  },
  ahl1: {
    code: 'ahl1',
    name: 'Al Ahly',
    angle: 90,
    textColor: '#fffcfc',
    colors: ['#ed1e07', '#cc150e', '#ed1e07'],
  },
  ahl2: {
    code: 'ahl2',
    name: 'Al Ahly',
    angle: 90,
    textColor: '#fffcfc',
    colors: ['#01030d', '#1c1b1a', '#01030d'],
  },
  esp1: {
    code: 'esp1',
    name: 'Esperance Tunis',
    angle: 0,
    textColor: '#fffcfc',
    colors: ['#b80000', '#f5ed00', '#b80000'],
  },
  esp2: {
    code: 'esp2',
    name: 'Esperance Tunis',
    angle: 0,
    textColor: '#fffcfc',
    colors: ['#001bc7'],
  },
  mam1: {
    code: 'mam1',
    name: 'Mamelodi Sundowns',
    angle: 90,
    textColor: '#fffcfc',
    colors: ['#ffffff', '#f2eb00', '#ffef0a'],
  },
  mam2: {
    code: 'mam2',
    name: 'Mamelodi Sundowns',
    angle: 90,
    textColor: '#fffcfc',
    colors: ['#032dff', '#f2eb00', '#140fa8'],
  },
  wyd1: {
    code: 'wyd1',
    name: 'Wydad Casablanca',
    angle: 0,
    textColor: '#000000',
    colors: ['#ff250d', '#ffffff', '#ff250d'],
  },
  wyd2: {
    code: 'wyd2',
    name: 'Wydad Casablanca',
    angle: 0,
    textColor: '#c40000',
    colors: ['#ffffff'],
  },
  auc1: {
    code: 'auc1',
    name: 'Auckland City',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#0d0947', '#080842', '#0d0947'],
  },
  auc2: {
    code: 'auc2',
    name: 'Auckland City',
    angle: 0,
    textColor: '#ffdd03',
    colors: ['#f2c200', '#fffafa', '#f2c200'],
  },
  ura1: { code: 'ura1', name: 'Urawa Reds', angle: 0, textColor: '#ffffff', colors: ['#cf0000'] },
  ura2: { code: 'ura2', name: 'Urawa Reds', angle: 0, textColor: '#ff1900', colors: ['#ffffff'] },
  uls1: {
    code: 'uls1',
    name: 'Ulsan Hyundai',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#000ed1', '#f2ad0c', '#000ed1'],
  },
  uls2: {
    code: 'uls2',
    name: 'Ulsan Hyundai',
    angle: 0,
    textColor: '#0898bd',
    colors: ['#ffffff'],
  },
  ain1: {
    code: 'ain1',
    name: 'Al Ain',
    angle: 90,
    textColor: '#fff5f5',
    colors: ['#6f00ff', '#200f2e', '#6f00ff'],
  },
  ain2: {
    code: 'ain2',
    name: 'Al Ain',
    angle: 0,
    textColor: '#f0e6e6',
    colors: ['#ffffff', '#6200e0', '#ffffff'],
  },
  hil1: {
    code: 'hil1',
    name: 'Al Hilal',
    angle: 90,
    textColor: '#fff4f4',
    colors: ['#0088ff', '#1b289e', '#0088ff'],
  },
  hil2: {
    code: 'hil2',
    name: 'Al Hilal',
    angle: 0,
    textColor: '#09a8d9',
    colors: ['#fffafa', '#d4d9d7', '#fffafa'],
  },
  pal1: {
    code: 'pal1',
    name: 'Palmeiras',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#06630c', '#088a11', '#1d9106'],
  },
  pal2: {
    code: 'pal2',
    name: 'Palmeiras',
    angle: 90,
    textColor: '#c7c7c7',
    colors: ['#e0d9ba', '#f2f5c6', '#e0d9ba'],
  },
  pal3: {
    code: 'pal3',
    name: 'Palmeiras',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#0c4501'],
  },
  pal4: {
    code: 'pal4',
    name: 'Palmeiras',
    angle: 0,
    textColor: '#34a834',
    colors: ['#cde3ca'],
  },
  pal5: {
    code: 'pal5',
    name: 'Palmeiras',
    angle: 0,
    textColor: '#1c8014',
    colors: ['#efff0d'],
  },
  bot1: {
    code: 'bot1',
    name: 'Botafogo',
    angle: 0,
    textColor: '#383838',
    colors: ['#000000', '#ffffff', '#000000'],
  },
  bot2: { code: 'bot2', name: 'Botafogo', angle: 0, textColor: '#000000', colors: ['#ffffff'] },
  bot3: { code: 'bot3', name: 'Botafogo', angle: 0, textColor: '#e8bb59', colors: ['#080808'] },
  fla1: {
    code: 'fla1',
    name: 'Flamengo',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#ba0707', '#000000', '#ba0707'],
  },
  fla2: { code: 'fla2', name: 'Flamengo', angle: 90, textColor: '#f20000', colors: ['#ffffff'] },
  fla3: {
    code: 'fla3',
    name: 'Flamengo',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#e01111', '#000000', '#e01111'],
  },
  fla4: {
    code: 'fla4',
    name: 'Flamengo',
    angle: 90,
    textColor: '#000000',
    colors: ['#f51313', '#f5f3f2', '#000000'],
  },
  fla5: {
    code: 'fla5',
    name: 'Flamengo',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#ff0000'],
  },
  flu1: {
    code: 'flu1',
    name: 'Fluminense',
    angle: 0,
    textColor: '#fff0f0',
    colors: ['#215c08', '#910803', '#215c08'],
  },
  flu2: { code: 'flu2', name: 'Fluminense', angle: 0, textColor: '#5e0707', colors: ['#ffffff'] },
  flu3: { code: 'flu3', name: 'Fluminense', angle: 0, textColor: '#c9a24d', colors: ['#7c1d23'] },
  boc1: {
    code: 'boc1',
    name: 'Boca Juniors',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#060536', '#d4cd00', '#060536'],
  },
  boc2: {
    code: 'boc2',
    name: 'Boca Juniors',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#edd500', '#172099', '#edd500'],
  },
  riv1: {
    code: 'riv1',
    name: 'River Plate',
    angle: 30,
    textColor: '#0f0f0f',
    colors: ['#ffffff', '#e80800', '#ffffff'],
  },
  riv2: {
    code: 'riv2',
    name: 'River Plate',
    angle: 0,
    textColor: '#dbdbdb',
    colors: ['#000000', '#9e1515', '#000000'],
  },
  por1: {
    code: 'por1',
    name: 'Porto',
    angle: 0,
    textColor: '#000000',
    colors: ['#0066ff', '#ffffff', '#0066ff'],
  },
  por2: {
    code: 'por2',
    name: 'Porto',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#ffa200', '#e69915', '#ffa200'],
  },
  ben1: { code: 'ben1', name: 'Benfica', angle: 90, textColor: '#ffffff', colors: ['#ff1900'] },
  ben2: {
    code: 'ben2',
    name: 'Benfica',
    angle: 90,
    textColor: '#e00000',
    colors: ['#fff2f2', '#e0e0e0', '#e0e0e0'],
  },
  psg1: {
    code: 'psg1',
    name: 'PSG',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#0c0794', '#bd1b09', '#0c0794'],
  },
  psg2: {
    code: 'psg2',
    name: 'PSG',
    angle: 90,
    textColor: '#01148f',
    colors: ['#ffffff', '#fc0000', '#ffffff'],
  },
  atm1: {
    code: 'atm1',
    name: 'Atletico Madrid',
    angle: 0,
    textColor: '#0a3bff',
    colors: ['#fc0000', '#fcfcfc', '#fc0000'],
  },
  atm2: {
    code: 'atm2',
    name: 'Atletico Madrid',
    angle: 0,
    textColor: '#dbb700',
    colors: ['#1a1e91'],
  },
  rea1: {
    code: 'rea1',
    name: 'Real Madrid',
    angle: 0,
    textColor: '#fad100',
    colors: ['#fff7f7'],
  },
  rea2: {
    code: 'rea2',
    name: 'Real Madrid',
    angle: 90,
    textColor: '#c9c3c3',
    colors: ['#0c1869', '#041869', '#0c1869'],
  },
  bay1: {
    code: 'bay1',
    name: 'Bayern',
    angle: 90,
    textColor: '#fffafa',
    colors: ['#ffffff', '#ff1c1c', '#ff1c1c'],
  },
  bay2: {
    code: 'bay2',
    name: 'Bayern',
    angle: 90,
    textColor: '#fffafa',
    colors: ['#ffdbdb', '#c7615d', '#ffdbdb'],
  },
  dor1: {
    code: 'dor1',
    name: 'Dortmund',
    angle: 90,
    textColor: '#fffafa',
    colors: ['#ffe600', '#000000', '#ffe600'],
  },
  dor2: {
    code: 'dor2',
    name: 'Dortmund',
    angle: 90,
    textColor: '#fffafa',
    colors: ['#d400ff', '#d400ff', '#690d73'],
  },
  che1: {
    code: 'che1',
    name: 'Chelsea',
    angle: 0,
    textColor: '#fffafa',
    colors: ['#0017b0', '#1812c9', '#0017b0'],
  },
  che2: {
    code: 'che2',
    name: 'Chelsea',
    angle: 0,
    textColor: '#090c7a',
    colors: ['#fff2f2', '#ff0800', '#f0e6e6'],
  },
  mci1: {
    code: 'mci1',
    name: 'Manchester City',
    angle: 30,
    textColor: '#ffffff',
    colors: ['#00d5ff', '#fff0f0', '#00d5ff'],
  },
  mci2: {
    code: 'mci2',
    name: 'Manchester City',
    angle: 150,
    textColor: '#0b0647',
    colors: ['#fff0f0', '#5c0000', '#fff0f0'],
  },
  int1: {
    code: 'int1',
    name: 'Internazionale',
    angle: 0,
    textColor: '#11096b',
    colors: ['#1605ff', '#000000', '#1605ff'],
  },
  int2: {
    code: 'int2',
    name: 'Internazionale',
    angle: 0,
    textColor: '#1d32bf',
    colors: ['#fff1ed'],
  },
  juv1: {
    code: 'juv1',
    name: 'Juventus',
    angle: 0,
    textColor: '#ebebeb',
    colors: ['#fffcfc', '#000000', '#fffcfc'],
  },
  juv2: { code: 'juv2', name: 'Juventus', angle: 0, textColor: '#ffffff', colors: ['#c4f3ff'] },
  rbs1: {
    code: 'rbs1',
    name: 'RB Salzburg',
    angle: 0,
    textColor: '#ff270f',
    colors: ['#ffffff'],
  },
  rbs2: {
    code: 'rbs2',
    name: 'RB Salzburg',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#d60000', '#9c1f16', '#d60000'],
  },
  vit1: {
    code: 'vit1',
    name: 'Vitoria',
    angle: 0,
    textColor: '#fff9f9',
    colors: ['#0d0d0d', '#ff0d05', '#0d0d0d'],
  },
  vit2: { code: 'vit2', name: 'Vitoria', angle: 0, textColor: '#d40606', colors: ['#f0f0f0'] },
  vit3: {
    code: 'vit3',
    name: 'Vitoria',
    angle: 0,
    textColor: '#570202',
    colors: ['#d40606', '#050000', '#d40606'],
  },
  con1: {
    code: 'con1',
    name: 'Confianca',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#0047ed', '#031cfc', '#031cfc'],
  },
  con2: { code: 'con2', name: 'Confianca', angle: 0, textColor: '#1323b0', colors: ['#ffffff'] },
  con3: { code: 'con3', name: 'Confianca', angle: 0, textColor: '#0affff', colors: ['#1e1780'] },
  sou1: { code: 'sou1', name: 'Sousa', angle: 0, textColor: '#fcfcfc', colors: ['#008033'] },
  sou2: { code: 'sou2', name: 'Sousa', angle: 0, textColor: '#1b871b', colors: ['#f0f0f0'] },
  sou3: { code: 'sou3', name: 'Sousa', angle: 0, textColor: '#e8db1e', colors: ['#f01707'] },
  csa1: {
    code: 'csa1',
    name: 'CSA',
    angle: 0,
    textColor: '#2930ff',
    colors: ['#1e1780', '#ffffff', '#1e1780'],
  },
  csa2: { code: 'csa2', name: 'CSA', angle: 0, textColor: '#14177a', colors: ['#fffcfc'] },
  csa3: {
    code: 'csa3',
    name: 'CSA',
    angle: 90,
    textColor: '#27348a',
    colors: ['#33ddff', '#111880', '#111880'],
  },
  rem1: { code: 'rem1', name: 'Remo', angle: 0, textColor: '#ffffff', colors: ['#0a0b2e'] },
  rem2: { code: 'rem2', name: 'Remo', angle: 0, textColor: '#0a0b2e', colors: ['#eddddd'] },
  rem3: { code: 'rem3', name: 'Remo', angle: 0, textColor: '#25c2b2', colors: ['#091180'] },
  pay1: {
    code: 'pay1',
    name: 'Paysandu',
    angle: 0,
    textColor: '#00258a',
    colors: ['#1fe9ff', '#ffffff', '#1fe9ff'],
  },
  pay2: { code: 'pay2', name: 'Paysandu', angle: 0, textColor: '#00258a', colors: ['#ffffff'] },
  pay3: { code: 'pay3', name: 'Paysandu', angle: 0, textColor: '#877f7e', colors: ['#000000'] },
  mir1: { code: 'mir1', name: 'Mirassol', angle: 0, textColor: '#154202', colors: ['#ffff21'] },
  mir2: { code: 'mir2', name: 'Mirassol', angle: 0, textColor: '#ede507', colors: ['#ffffff'] },
  mir3: { code: 'mir3', name: 'Mirassol', angle: 0, textColor: '#f0ff17', colors: ['#ed6d24'] },
  nov1: {
    code: 'nov1',
    name: 'Novorizontino',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#ffe814', '#000000', '#ffe814'],
  },
  nov2: {
    code: 'nov2',
    name: 'Novorizontino',
    angle: 0,
    textColor: '#ffcc00',
    colors: ['#fffcfc'],
  },
  nov3: {
    code: 'nov3',
    name: 'Novorizontino',
    angle: 0,
    textColor: '#dbaf00',
    colors: ['#000000'],
  },
  gua1: {
    code: 'gua1',
    name: 'Guarani',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#13450c', '#103b0a', '#0f3609'],
  },
  gua2: { code: 'gua2', name: 'Guarani', angle: 90, textColor: '#1b6110', colors: ['#ffffff'] },
  gua3: { code: 'gua3', name: 'Guarani', angle: 90, textColor: '#e6d820', colors: ['#27277d'] },
  pon1: {
    code: 'pon1',
    name: 'Ponte Preta',
    angle: 30,
    textColor: '#2e2d2d',
    colors: ['#e0e0e0', '#000000', '#e0e0e0'],
  },
  pon2: {
    code: 'pon2',
    name: 'Ponte Preta',
    angle: 30,
    textColor: '#fcfcfc',
    colors: ['#000000', '#e0e0e0', '#000000'],
  },
  pon3: {
    code: 'pon3',
    name: 'Ponte Preta',
    angle: 30,
    textColor: '#fcd32d',
    colors: ['#292929'],
  },
  ava1: {
    code: 'ava1',
    name: 'Avai',
    angle: 0,
    textColor: '#e0d7d7',
    colors: ['#ffffff', '#1499ff', '#ffffff'],
  },
  ava2: { code: 'ava2', name: 'Avai', angle: 0, textColor: '#2f92d4', colors: ['#ffffff'] },
  ava3: {
    code: 'ava3',
    name: 'Avai',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#2197ff', '#0a4e82', '#2197ff'],
  },
  cha1: {
    code: 'cha1',
    name: 'Chapecoense',
    angle: 0,
    textColor: '#d6d6d6',
    colors: ['#17631f', '#fafafa', '#17631f'],
  },
  cha2: {
    code: 'cha2',
    name: 'Chapecoense',
    angle: 0,
    textColor: '#1b8f1f',
    colors: ['#f2f2f2'],
  },
  cha3: {
    code: 'cha3',
    name: 'Chapecoense',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#41d99c', '#15591c', '#17631f'],
  },
  ctb1: {
    code: 'ctb1',
    name: 'Coritiba',
    angle: 0,
    textColor: '#d4d4d4',
    colors: ['#fafafa', '#114716', '#fafafa'],
  },
  ctb2: {
    code: 'ctb2',
    name: 'Coritiba',
    angle: 90,
    textColor: '#24942d',
    colors: ['#134f18', '#e8e8e8', '#134f18'],
  },
  ctb3: {
    code: 'ctb3',
    name: 'Coritiba',
    angle: 90,
    textColor: '#ffffff',
    colors: ['#e8e8e8', '#0b2e0e', '#e8e8e8'],
  },
  vas1: {
    code: 'vas1',
    name: 'Vasco',
    angle: 30,
    textColor: '#d91b0d',
    colors: ['#191919', '#ffffff', '#191919'],
  },
  vas2: {
    code: 'vas2',
    name: 'Vasco',
    angle: 30,
    textColor: '#d91b0d',
    colors: ['#ffffff', '#191919', '#ffffff'],
  },
  vas3: { code: 'vas3', name: 'Vasco', angle: 30, textColor: '#d98729', colors: ['#4a2e1f'] },
  cor1: {
    code: 'cor1',
    name: 'Corinthians',
    angle: 45,
    textColor: '#000000',
    colors: ['#ffffff', '#000000', '#1c1c1c'],
  },
  cor2: {
    code: 'cor2',
    name: 'Corinthians',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#000000', '#fffdfc', '#000000'],
  },
  cor3: {
    code: 'cor3',
    name: 'Corinthians',
    angle: 0,
    textColor: '#ff8e1c',
    colors: ['#000000'],
  },
  sao1: {
    code: 'sao1',
    name: 'Sao Paulo',
    angle: 90,
    textColor: '#000000',
    colors: ['#ff0000', '#fffdfc', '#000000'],
  },
  sao2: {
    code: 'sao2',
    name: 'Sao Paulo',
    angle: 0,
    textColor: '#ffffff',
    colors: ['#d60000', '#ffffff', '#000000'],
  },
  sao3: { code: 'sao3', name: 'Sao Paulo', angle: 0, textColor: '#c7a24b', colors: ['#000000'] },
  san1: { code: 'san1', name: 'Santos', angle: 30, textColor: '#0a0602', colors: ['#e8e8e8'] },
  san2: {
    code: 'san2',
    name: 'Santos',
    angle: 0,
    textColor: '#bfa628',
    colors: ['#191919', '#f5f5f5', '#191919'],
  },
  san3: { code: 'san3', name: 'Santos', angle: 0, textColor: '#0f0d03', colors: ['#48dbcd'] },
  rbb1: {
    code: 'rbb1',
    name: 'RB Bragantino',
    angle: 0,
    textColor: '#f21313',
    colors: ['#faf1f0'],
  },
  rbb2: {
    code: 'rbb2',
    name: 'RB Bragantino',
    angle: 0,
    textColor: '#c90e0e',
    colors: ['#1f4fa3'],
  },
  rbb3: {
    code: 'rbb3',
    name: 'RB Bragantino',
    angle: 0,
    textColor: '#c4161c',
    colors: ['#0e0e10'],
  },
  crz1: { code: 'crz1', name: 'Cruzeiro', angle: 0, textColor: '#fffcfc', colors: ['#0b3c8c'] },
  crz2: {
    code: 'crz2',
    name: 'Cruzeiro',
    angle: 90,
    textColor: '#07648c',
    colors: ['#00468c', '#f5f5f5', '#00468c'],
  },
  crz3: { code: 'crz3', name: 'Cruzeiro', angle: 90, textColor: '#f36b21', colors: ['#125fb8'] },
  cam1: {
    code: 'cam1',
    name: 'Atletico MG',
    angle: 0,
    textColor: '#c4971b',
    colors: ['#1f1f1f', '#f5f5f5', '#1f1f1f'],
  },
  cam2: {
    code: 'cam2',
    name: 'Atletico MG',
    angle: 90,
    textColor: '#c4971b',
    colors: ['#1f1f1f', '#f5f5f5', '#f5f5f5'],
  },
  cam3: {
    code: 'cam3',
    name: 'Atletico MG',
    angle: 90,
    textColor: '#c4971b',
    colors: ['#141414'],
  },
  gre1: {
    code: 'gre1',
    name: 'Gremio',
    angle: 0,
    textColor: '#0e0e10',
    colors: ['#00a6d9', '#f5f6f4', '#00a6d9'],
  },
  gre2: { code: 'gre2', name: 'Gremio', angle: 0, textColor: '#19a8d4', colors: ['#cfe6f2'] },
  gre3: { code: 'gre3', name: 'Gremio', angle: 0, textColor: '#c9a24d', colors: ['#1e1e5e'] },
  inl1: {
    code: 'inl1',
    name: 'Internacional',
    angle: 0,
    textColor: '#fffafa',
    colors: ['#e80e0e'],
  },
  inl2: {
    code: 'inl2',
    name: 'Internacional',
    angle: 0,
    textColor: '#ff0505',
    colors: ['#fff8f5'],
  },
  inl3: {
    code: 'inl3',
    name: 'Internacional',
    angle: 0,
    textColor: '#2e2d2d',
    colors: ['#000000'],
  },
};

function hexToInt(hex) {
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function colorDistance(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function areUniformsSimilar(uniformA, uniformB) {
  if (!uniformA || !uniformB) return false;
  const primaryA = uniformA.colors[0] || '#000000';
  const primaryB = uniformB.colors[0] || '#000000';
  return colorDistance(primaryA, primaryB) < COLOR_SIMILARITY_THRESHOLD;
}

function suggestAlternatives(targetUniform, excludeCode) {
  const options = Object.values(UNIFORMS).filter((u) => u.code !== excludeCode);
  const scored = options.map((u) => {
    const distance = colorDistance(u.colors[0], targetUniform.colors[0]);
    return { code: u.code, distance };
  });
  const sorted = scored.sort((a, b) => b.distance - a.distance);
  return sorted.slice(0, 4).map((s) => `!${s.code}`);
}

function isChampionshipRoom(room) {
  const settings = (globalThis && globalThis.customSettings) || room?.customSettings || null;
  const name = (settings && settings.name) || room?.name || room?.roomName || '';
  const marker =
    settings &&
    (settings.championship || settings.isChampionship || settings.format === 'championship');
  if (marker) return true;
  if (typeof name === 'string') {
    const lower = name.toLowerCase();
    if (lower.includes('campeonato') || lower.includes('championship')) return true;
  }
  return false;
}

function getRankingScore(player) {
  if (!player) return 0;
  if (typeof player.ranking === 'number') return player.ranking;
  if (typeof player.rating === 'number') return player.rating;
  if (typeof player.elo === 'number') return player.elo;
  if (typeof player.points === 'number') return player.points;
  return 0;
}

function getTeamTopPlayerId(room, team) {
  if (!room || !room.getPlayerList) return null;
  const players = room.getPlayerList().filter((p) => p.team === team);
  if (players.length === 0) return null;
  const ranked = players
    .map((p) => ({ id: p.id, score: getRankingScore(p), admin: !!p.admin }))
    .sort((a, b) => {
      if (a.score === b.score) return b.admin - a.admin || a.id - b.id;
      return b.score - a.score;
    });
  return ranked[0]?.id || null;
}

function ensureUniformState(room) {
  if (!room.__uniformState) {
    room.__uniformState = { 1: null, 2: null };
  }
}

function applyUniform(room, team, uniform) {
  ensureUniformState(room);
  const angle = uniform.angle || DEFAULT_ANGLE;
  const textColor = hexToInt(uniform.textColor || DEFAULT_TEXT_COLOR);
  const colors = (uniform.colors || []).map((c) => hexToInt(c));
  try {
    room.setTeamColors(team, angle, textColor, colors);
  } catch (err) {
    console.error('[UNIFORMS] Erro ao aplicar cores:', err.message);
  }
  room.__uniformState[team] = {
    name: uniform.name,
    code: uniform.code,
    colors: uniform.colors,
  };
}

function canChangeUniform(room, player, team) {
  const championship = isChampionshipRoom(room);
  if (championship) {
    return !!player.admin;
  }
  if (player.admin) return true;
  const topPlayerId = getTeamTopPlayerId(room, team);
  return topPlayerId === player.id;
}

function handleUniformCommand(room, player, message) {
  if (!room || !player || typeof message !== 'string') return false;
  const parts = message.trim().split(/\s+/);
  if (parts.length < 2) {
    room.sendAnnouncement(
      'Uso: !uni <sigla+numero>. Ex: !uni fla1',
      player.id,
      0xffaa00,
      'bold',
      1
    );
    return true;
  }

  const team = player.team;
  if (team !== 1 && team !== 2) {
    room.sendAnnouncement(
      'Entre em um time para mudar o uniforme.',
      player.id,
      0xff9900,
      'normal',
      1
    );
    return true;
  }

  const code = parts[1].toLowerCase();
  const uniform = UNIFORMS[code];
  if (!uniform) {
    const list = Object.keys(UNIFORMS)
      .map((c) => `!${c}`)
      .join(' ');
    room.sendAnnouncement(
      `Uniforme nao encontrado. Disponiveis: ${list}`,
      player.id,
      0xff9900,
      'normal',
      1
    );
    return true;
  }

  const allowed = canChangeUniform(room, player, team);
  if (!allowed) {
    if (isChampionshipRoom(room)) {
      room.sendAnnouncement(
        'Apenas admins podem trocar uniforme em sala de campeonato.',
        player.id,
        0xff0000,
        'bold',
        1
      );
    } else {
      room.sendAnnouncement(
        'Apenas o melhor ranqueado do time pode trocar o uniforme.',
        player.id,
        0xff0000,
        'bold',
        1
      );
    }
    return true;
  }

  ensureUniformState(room);
  const otherTeam = team === 1 ? 2 : 1;
  const otherUniform = room.__uniformState[otherTeam];
  if (otherUniform && areUniformsSimilar(uniform, otherUniform)) {
    const suggestions = suggestAlternatives(otherUniform, code);
    const suggestionText =
      suggestions.length > 0 ? suggestions.join(' ') : '!fla1 !bot1 !mir1 !vas1';
    room.sendAnnouncement(
      `Uniforme parecido com o do outro time. Sugestoes: ${suggestionText}`,
      player.id,
      0xffaa00,
      'bold',
      1
    );
    return true;
  }

  applyUniform(room, team, uniform);
  room.sendAnnouncement(
    `Uniforme do time ${team === 1 ? 'vermelho' : 'azul'} alterado para ${uniform.name}.`,
    null,
    0x00ff00,
    'bold',
    1
  );
  return true;
}

module.exports = {
  handleUniformCommand,
  uniforms: UNIFORMS,
  isChampionshipRoom,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
