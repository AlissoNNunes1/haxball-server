//Real Soccer Variables
var fieldWidth;
var fieldHeight;
var fieldWidthLimit;
var fieldHeightLimit;
var throwTimeOut = 600;
var gkTimeOut = 600;
var ckTimeOut = 400;
var throwinDistance = 270;
var mapBGColor = '86A578';
var superAdminCode = 'assugoat';
var allowPublicAdmin = true;
var powerShotMode = true;
var amarelo = 0xffc766;
var vermelho = 0xc94c40;
var azul = 0x3333ff;
var verde = 0x29a329;

function getRealSoccerMap(map) {
  map = {
    name: 'CIRS Stadium',

    width: 1821,

    height: 945,

    spawnDistance: 560,

    bg: { type: 'grass', width: 1610, height: 840, kickOffRadius: 252, cornerRadius: 0 },

    playerPhysics: {
      bCoef: 0.3,
      invMass: 0.5,
      damping: 0.96,
      acceleration: 0.12,
      kickingAcceleration: 0.08,
      kickingDamping: 0.97,
      kickStrength: 4.99,
    },

    ballPhysics: {
      radius: 8.25,
      bCoef: 0.5,
      invMass: 1.05,
      damping: 0.99,
      color: 'FFFFFF',
      cMask: ['all'],
      cGroup: ['ball'],
    },

    vertexes: [
      /* 0 */ { x: 0, y: 945.7899108644018, trait: 'kickOffBarrier' },
      /* 1 */ { x: 0, y: 252.2106428971738, trait: 'kickOffBarrier' },
      /* 2 */ { x: 0, y: -252.2106428971738, trait: 'kickOffBarrier' },
      /* 3 */ { x: 0, y: -945.7899108644018, trait: 'kickOffBarrier' },

      /* 4 */ { x: 1610, y: 448.37447626164237, trait: 'line' },
      /* 5 */ { x: 1176.983000186811, y: 448.37447626164237, trait: 'line' },
      /* 6 */ { x: 1610, y: -448.37447626164237, trait: 'line' },
      /* 7 */ { x: 1176.983000186811, y: -448.37447626164237, trait: 'line' },
      /* 8 */ { x: 1610, y: 252.2106428971738, trait: 'line' },
      /* 9 */ { x: 1443.2053454671614, y: 252.2106428971738, trait: 'line' },
      /* 10 */ { x: 1610, y: -252.2106428971738, trait: 'line' },
      /* 11 */ { x: 1443.2053454671614, y: -252.2106428971738, trait: 'line' },
      /* 12 */ { x: 1176.983000186811, y: -182.1521309812922, trait: 'line', curve: -130 },
      /* 13 */ { x: 1176.983000186811, y: 182.1521309812922, trait: 'line', curve: -130 },
      /* 14 */ { x: -1610, y: -448.37447626164237, trait: 'line' },
      /* 15 */ { x: -1176.983000186811, y: -448.37447626164237, trait: 'line' },
      /* 16 */ { x: -1610, y: 448.37447626164237, trait: 'line' },
      /* 17 */ { x: -1176.983000186811, y: 448.37447626164237, trait: 'line' },
      /* 18 */ { x: -1610, y: -245.20479170558565, trait: 'line' },
      /* 19 */ { x: -1443.2053454671614, y: -245.20479170558565, trait: 'line' },
      /* 20 */ { x: -1610, y: 245.20479170558565, trait: 'line' },
      /* 21 */ { x: -1443.2053454671614, y: 245.20479170558565, trait: 'line' },
      /* 22 */ { x: -1176.983000186811, y: 182.1521309812922, trait: 'line', curve: -130 },
      /* 23 */ { x: -1176.983000186811, y: -182.1521309812922, trait: 'line', curve: -130 },
      /* 24 */ { x: 1310.0941728269863, y: 4.2035107149528965, trait: 'line' },
      /* 25 */ { x: 1310.0941728269863, y: -4.2035107149528965, trait: 'line' },
      /* 26 */ { x: -1310.0941728269863, y: 4.2035107149528965, trait: 'line' },
      /* 27 */ { x: -1310.0941728269863, y: -4.2035107149528965, trait: 'line' },
      /* 28 */ { x: -1610, y: 810, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      /* 29 */ { x: -1580, y: 840, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      /* 30 */ { x: -1580, y: -840, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      /* 31 */ { x: -1610, y: -810, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      /* 32 */ {
        x: 1569.3106669157482,
        y: 840.7021429905794,
        bCoef: -2.9,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
      },
      /* 33 */ {
        x: 1610,
        y: 798.6670358410504,
        bCoef: -2.9,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
      },
      /* 34 */ {
        x: 1610,
        y: -798.6670358410504,
        bCoef: -2.9,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
      },
      /* 35 */ {
        x: 1569.3106669157482,
        y: -840.7021429905794,
        bCoef: -2.9,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
      },

      /* 36 */ {
        x: 0,
        y: 252.2106428971738,
        bCoef: 0.1,
        cMask: ['red', 'blue'],
        cGroup: ['blueKO'],
        trait: 'kickOffBarrier',
        curve: -180,
      },
      /* 37 */ {
        x: 0,
        y: -252.2106428971738,
        bCoef: 0.1,
        cMask: ['red', 'blue'],
        cGroup: ['redKO'],
        trait: 'kickOffBarrier',
        curve: 180,
      },
      /* 38 */ {
        x: 0,
        y: 252.2106428971738,
        bCoef: 0.1,
        cMask: ['red', 'blue'],
        cGroup: ['redKO'],
        trait: 'kickOffBarrier',
        curve: 180,
      },

      /* 39 */ {
        x: -1443.2053454671614,
        y: -56.046809532705296,
        bCoef: -5.7,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
        curve: 70,
        color: '576C46',
        vis: false,
      },
      /* 40 */ {
        x: -1443.2053454671614,
        y: 56.046809532705296,
        bCoef: -5.7,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
        curve: 70,
        color: '576C46',
        vis: false,
      },
      /* 41 */ {
        x: 1443.2053454671614,
        y: -56.046809532705296,
        bCoef: -5.7,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
        curve: -70,
        color: '576C46',
        vis: false,
      },
      /* 42 */ {
        x: 1443.2053454671614,
        y: 56.046809532705296,
        bCoef: -5.7,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
        curve: -70,
        color: '576C46',
        vis: false,
      },
      /* 43 */ { x: 1443.2053454671614, y: -56.046809532705296, trait: 'line', color: '576C46' },
      /* 44 */ { x: 1443.2053454671614, y: 56.046809532705296, trait: 'line', color: '576C46' },
      /* 45 */ { x: -1443.2053454671614, y: -56.046809532705296, trait: 'line', color: '576C46' },
      /* 46 */ { x: -1443.2053454671614, y: 56.046809532705296, trait: 'line', color: '576C46' },
      /* 47 */ { x: 0, y: 4.2035107149528965, trait: 'line', radius: 10 },
      /* 48 */ { x: 0, y: -4.2035107149528965, trait: 'line', radius: 10 },

      /* 49 */ {
        x: -1821.521309812922,
        y: -700,
        bCoef: 0,
        cMask: ['c1'],
        cGroup: ['red', 'blue'],
        color: 'ec644b',
        vis: false,
      },
      /* 50 */ {
        x: 1821.521309812922,
        y: -700,
        bCoef: 0,
        cMask: ['c1'],
        cGroup: ['red', 'blue'],
        color: 'ec644b',
        vis: false,
      },
      /* 51 */ {
        x: -1821.521309812922,
        y: 700,
        bCoef: 0,
        cMask: ['c1'],
        cGroup: ['red', 'blue'],
        color: 'ec644b',
        vis: false,
      },
      /* 52 */ {
        x: 1821.521309812922,
        y: 700,
        bCoef: 0,
        cMask: ['c1'],
        cGroup: ['red', 'blue'],
        color: 'ec644b',
        vis: false,
      },
      /* 53 */ {
        x: -1814.515458621334,
        y: -448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 54 */ {
        x: -1176.983000186811,
        y: -448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 55 */ {
        x: -1176.983000186811,
        y: 448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 56 */ {
        x: -1814.515458621334,
        y: 448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 57 */ {
        x: 1814.515458621334,
        y: -448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 58 */ {
        x: 1176.983000186811,
        y: -448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 59 */ {
        x: 1176.983000186811,
        y: 448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 60 */ {
        x: 1814.515458621334,
        y: 448.37447626164237,
        cMask: ['c0'],
        cGroup: ['red', 'blue'],
      },
      /* 61 */ { x: -1610, y: -150, bCoef: 0.1, cMask: ['ball', 'red', 'blue'] },
      /* 62 */ { x: -1690, y: -150, bCoef: 0.1, cMask: ['red', 'blue'], bias: 0, curve: 5 },
      /* 63 */ { x: -1610, y: 150, bCoef: 0.1, cMask: ['ball', 'red', 'blue'] },
      /* 64 */ { x: -1690, y: 150, bCoef: 0.1, cMask: ['red', 'blue'], bias: 0, curve: 5 },
      /* 65 */ { x: -1740, y: -196, bCoef: 0, cMask: ['ball'], pos: [-1740, -196] },
      /* 66 */ { x: -1740, y: 196, bCoef: 0, cMask: ['ball'], pos: [-1740, 196] },
      /* 67 */ { x: 1610, y: 150, bCoef: 0.1, cMask: ['ball', 'red', 'blue'], pos: [1610, 173] },
      /* 68 */ { x: 1690, y: 150, bCoef: 0.1, cMask: ['red', 'blue'], curve: -5 },
      /* 69 */ { x: 1610, y: -150, bCoef: 0.1, cMask: ['ball', 'red', 'blue'] },
      /* 70 */ { x: 1690, y: -150, bCoef: 0.1, cMask: ['red', 'blue'], curve: -5 },
      /* 71 */ { x: 1751.4627978970404, y: -221.38489765418592, bCoef: 0, cMask: ['ball'] },
      /* 72 */ { x: 1751.4627978970404, y: 221.38489765418592, bCoef: 0, cMask: ['ball'] },
    ],

    segments: [
      { v0: 0, v1: 1, trait: 'kickOffBarrier' },
      { v0: 2, v1: 3, trait: 'kickOffBarrier' },

      { v0: 4, v1: 5, trait: 'line', y: 320 },
      { v0: 5, v1: 7, trait: 'line', x: 840 },
      { v0: 6, v1: 7, trait: 'line', y: -320 },
      { v0: 8, v1: 9, trait: 'line', y: 180 },
      { v0: 9, v1: 11, trait: 'line', x: 1030 },
      { v0: 10, v1: 11, trait: 'line', y: -180 },
      { v0: 12, v1: 13, curve: -130, trait: 'line', x: 840 },
      { v0: 14, v1: 15, trait: 'line', y: -320 },
      { v0: 15, v1: 17, trait: 'line', x: -840 },
      { v0: 16, v1: 17, trait: 'line', y: 320 },
      { v0: 18, v1: 19, trait: 'line', y: -175 },
      { v0: 19, v1: 21, trait: 'line', x: -1030 },
      { v0: 20, v1: 21, trait: 'line', y: 175 },
      { v0: 22, v1: 23, curve: -130, trait: 'line', x: -840 },
      { v0: 24, v1: 25, curve: -180, trait: 'line', x: 935 },
      { v0: 26, v1: 27, curve: -180, trait: 'line', x: -935 },
      { v0: 24, v1: 25, curve: 180, trait: 'line', x: 935 },
      { v0: 26, v1: 27, curve: 180, trait: 'line', x: -935 },
      { v0: 24, v1: 25, curve: 90, trait: 'line', x: 935 },
      { v0: 26, v1: 27, curve: 90, trait: 'line', x: -935 },
      { v0: 24, v1: 25, curve: -90, trait: 'line', x: 935 },
      { v0: 26, v1: 27, curve: -90, trait: 'line', x: -935 },
      { v0: 24, v1: 25, trait: 'line', x: 935 },
      { v0: 26, v1: 27, trait: 'line', x: -935 },
      { v0: 28, v1: 29, curve: 90, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      { v0: 30, v1: 31, curve: 90, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      { v0: 32, v1: 33, curve: 90, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },
      { v0: 34, v1: 35, curve: 90, bCoef: -2.9, cMask: ['ball'], cGroup: ['c0'], trait: 'line' },

      {
        v0: 37,
        v1: 36,
        curve: -180,
        vis: false,
        bCoef: 0.1,
        cGroup: ['blueKO'],
        trait: 'kickOffBarrier',
      },

      {
        v0: 39,
        v1: 40,
        curve: 70,
        vis: false,
        color: '576C46',
        bCoef: -5.7,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
        x: -1030,
      },
      {
        v0: 41,
        v1: 42,
        curve: -70,
        vis: false,
        color: '576C46',
        bCoef: -5.7,
        cMask: ['ball'],
        cGroup: ['c0'],
        trait: 'line',
        x: 1030,
      },

      {
        v0: 37,
        v1: 38,
        curve: 180,
        vis: false,
        bCoef: 0.1,
        cMask: ['red', 'blue'],
        cGroup: ['redKO'],
        trait: 'kickOffBarrier',
      },

      { v0: 43, v1: 44, vis: true, color: '576C46', trait: 'line', x: 1030 },
      { v0: 45, v1: 46, vis: true, color: '576C46', trait: 'line', x: -1030 },
      { v0: 47, v1: 48, curve: -180, trait: 'line', x: -935, radius: 10 },
      { v0: 47, v1: 48, curve: 180, trait: 'line', x: -935, radius: 10 },
      { v0: 47, v1: 48, curve: 90, trait: 'line', x: -935, radius: 10 },
      { v0: 47, v1: 48, curve: -90, trait: 'line', x: -935, radius: 10 },
      { v0: 47, v1: 48, trait: 'line', x: -935, radius: 10 },

      {
        v0: 49,
        v1: 50,
        vis: false,
        color: 'ec644b',
        bCoef: 0,
        cMask: ['c1'],
        cGroup: ['red', 'blue'],
        y: -700,
      },
      {
        v0: 51,
        v1: 52,
        vis: false,
        color: 'ec644b',
        bCoef: 0,
        cMask: ['c1'],
        cGroup: ['red', 'blue'],
        y: 700,
      },
      { v0: 53, v1: 54, vis: false, color: 'ec644b', cMask: ['c0'], cGroup: ['red', 'blue'] },
      { v0: 54, v1: 55, vis: false, color: 'ec644b', cMask: ['c0'], cGroup: ['red', 'blue'] },
      { v0: 55, v1: 56, vis: false, color: 'ec644b', cMask: ['c0'], cGroup: ['red', 'blue'] },
      { v0: 57, v1: 58, vis: false, cMask: ['c0'], cGroup: ['red', 'blue'] },
      { v0: 58, v1: 59, vis: false, cMask: ['c0'], cGroup: ['red', 'blue'] },
      { v0: 59, v1: 60, vis: false, cMask: ['c0'], cGroup: ['red', 'blue'] },
      { v0: 61, v1: 62, color: 'FFFFFF', bCoef: 0.1, cMask: ['ball', 'red', 'blue'], y: -150 },
      { v0: 63, v1: 64, color: 'FFFFFF', bCoef: 0.1, cMask: ['ball', 'red', 'blue'], y: 150 },
      {
        v0: 64,
        v1: 62,
        curve: 5,
        color: 'FFFFFF',
        bCoef: 0.1,
        cMask: ['ball', 'red', 'blue'],
        bias: 0,
        x: -1690,
      },
      { v0: 62, v1: 65, color: 'FFFFFF', bCoef: 0, cMask: ['ball'] },
      { v0: 64, v1: 66, color: 'FFFFFF', bCoef: 0, cMask: ['ball'] },
      { v0: 67, v1: 68, color: 'FFFFFF', bCoef: 0.1, cMask: ['ball', 'red', 'blue'], y: 150 },
      { v0: 69, v1: 70, color: 'FFFFFF', bCoef: 0.1, cMask: ['ball', 'red', 'blue'], y: -150 },
      {
        v0: 68,
        v1: 70,
        curve: -5,
        color: 'FFFFFF',
        bCoef: 0.1,
        cMask: ['ball', 'red', 'blue'],
        x: 1690,
      },
      { v0: 70, v1: 71, color: 'FFFFFF', bCoef: 0, cMask: ['ball'] },
      { v0: 68, v1: 72, color: 'FFFFFF', bCoef: 0, cMask: ['ball'] },
    ],

    goals: [
      { p0: [-1620.6373256311497, 150], p1: [-1620.6373256311497, -150], team: 'red' },
      { p0: [1620, 150], p1: [1620, -150], team: 'blue', radius: 0, invMass: 1 },
    ],

    discs: [
      {
        radius: 0,
        invMass: 0,
        pos: [-1836.934182434416, -26.622234528035015],
        color: 'ffffffff',
        bCoef: 0,
        cMask: ['red'],
        cGroup: ['ball'],
      },
      {
        radius: 0,
        invMass: 0,
        pos: [-1835.5330121960983, 40.633936911211336],
        color: 'ffffffff',
        bCoef: 0,
        cMask: ['blue'],
        cGroup: ['ball'],
      },
      {
        radius: 0,
        invMass: 0,
        pos: [-1832.730671719463, 86.8725547756932],
        color: 'ffffffff',
        bCoef: 0,
        cMask: ['red', 'blue'],
        cGroup: ['ball'],
      },

      { radius: 3.7831596434576076, pos: [-1610, 840], cGroup: ['ball'], trait: 'cornerflag' },
      {
        radius: 3.7831596434576076,
        pos: [1610, -840.7021429905794],
        cGroup: ['ball'],
        trait: 'cornerflag',
      },
      {
        radius: 3.7831596434576076,
        pos: [1610, 840.7021429905794],
        cGroup: ['ball'],
        trait: 'cornerflag',
      },

      {
        radius: 6.21048543178578,
        invMass: 0,
        pos: [-1610, -150],
        bCoef: 0.5,
        trait: 'goalPost',
        x: -1610,
      },
      {
        radius: 6.21048543178578,
        invMass: 0,
        pos: [-1610, 150],
        bCoef: 0.5,
        trait: 'goalPost',
        x: -1610,
      },
      {
        radius: 2.4841941727143118,
        invMass: 0,
        pos: [-1740, -196],
        color: '000000',
        bCoef: 1,
        trait: 'goalPost',
        x: -1740,
        y: -196,
      },
      {
        radius: 2.4841941727143118,
        invMass: 0,
        pos: [-1740, 196],
        color: '000000',
        bCoef: 1,
        trait: 'goalPost',
        y: 196,
        x: -1740,
      },
      { radius: 7.005851191588162, invMass: 0, pos: [1610, -150], bCoef: 0.5, trait: 'goalPost' },
      {
        radius: 7.005851191588162,
        invMass: 0,
        pos: [1610, 150],
        bCoef: 0.5,
        trait: 'goalPost',
        x: 1610,
      },
      {
        radius: 2.8023404766352646,
        invMass: 0,
        pos: [1751.4627978970404, -221.38489765418592],
        color: '000000',
        bCoef: 1,
        trait: 'goalPost',
      },
      {
        radius: 2.8023404766352646,
        invMass: 0,
        pos: [1751.4627978970404, 221.38489765418592],
        color: '000000',
        bCoef: 1,
        trait: 'goalPost',
      },

      {
        radius: 3.7831596434576076,
        pos: [-1610, -840.7021429905794],
        cGroup: ['ball'],
        trait: 'cornerflag',
      },

      { radius: 0, pos: [10000, 840], cMask: [] },
      { radius: 0, pos: [10000, -840], cMask: [] },
      { radius: 0, pos: [10000, 840], cMask: [] },
      { radius: 0, pos: [10000, -840], cMask: [] },
      { radius: 0, pos: [-1149, 460], cMask: [] },
      { radius: 0, pos: [1149, 460], cMask: [] },
      { radius: 0, pos: [-1149, 460], cMask: [] },
      { radius: 0, pos: [1149, 460], cMask: [] },
    ],

    planes: [
      { normal: [0, 1], dist: -902, bCoef: 0, cGroup: ['ball'], trait: 'ballArea' },
      { normal: [0, -1], dist: -902, bCoef: 0, cGroup: ['ball'], trait: 'ballArea' },

      { normal: [0, 1], dist: -945, bCoef: 0 },
      { normal: [0, -1], dist: -945, bCoef: 0 },
      { normal: [1, 0], dist: -1821, bCoef: 0 },
      { normal: [-1, 0], dist: -1821, bCoef: 0.1 },
      { normal: [1, 0], dist: -1751, bCoef: 0, cMask: ['ball'], cGroup: ['ball'] },
      { normal: [-1, 0], dist: -1751, bCoef: 0, cMask: ['ball'], cGroup: ['ball'] },
    ],

    traits: {
      ballArea: { vis: false, bCoef: 0, cMask: ['ball'], cGroup: ['ball'] },
      goalPost: { radius: 5, invMass: 0, bCoef: 1, cGroup: ['wall'] },
      rightNet: { radius: 0, invMass: 1, bCoef: 0, cGroup: ['ball', 'c3'] },
      leftNet: { radius: 0, invMass: 1, bCoef: 0, cGroup: ['ball', 'c2'] },
      stanchion: { radius: 3, invMass: 0, bCoef: 3, cMask: ['none'] },
      cornerflag: { radius: 3, invMass: 0, bCoef: 0.2, color: 'FFFF00', cMask: ['ball'] },
      reargoalNetleft: {
        vis: true,
        bCoef: 0.1,
        cMask: ['ball', 'red', 'blue'],
        curve: 10,
        color: 'C7E6BD',
      },
      reargoalNetright: {
        vis: true,
        bCoef: 0.1,
        cMask: ['ball', 'red', 'blue'],
        curve: -10,
        color: 'C7E6BD',
      },
      sidegoalNet: { vis: true, bCoef: 1, cMask: ['ball', 'red', 'blue'], color: 'C7E6BD' },
      kickOffBarrier: {
        vis: false,
        bCoef: 0.1,
        cGroup: ['redKO', 'blueKO'],
        cMask: ['red', 'blue'],
      },
      line: { vis: true, cMask: [], color: 'C7E6BD' },
    },

    redSpawnPoints: [],

    blueSpawnPoints: [],

    canBeStored: true,

    joints: [
      { d0: 18, d1: 19, strength: 'rigid', color: 'ff0000', length: null },
      { d0: 16, d1: 17, strength: 'rigid', color: '0000ff', length: null },
    ],

    kickOffReset: 'full',
  };
  penalArea = [1176, 448];
  penalMark = 1310;
  goalKickCoord = 1473;
  cornerKickCoord = [1595, 825];
  cornerKickStrength = 2.175;
  goalKickStrength = 1.55555;

  currentStadium = map;
  goalCoord_x = Math.abs(map.goals[0].p0[0]);
  goalCoord_y = Math.abs(map.goals[0].p0[1]);
  goalsCoord = [goalCoord_x, goalCoord_y];
  return JSON.stringify(map);
}
var currentStadium;
var goalsCoord;
var penalArea;
var penalMark;
var goalKickCoord;
var cornerKickCoord;
var cornerKickStrength;
var goalKickStrength;

var roomName = '🏆 𝐂𝐈𝐑𝐒 | COPA DO BRASIL • 2022 🏆 ';
var roomPassword = null;
var maxPlayers = 26;
var roomPublic = true;
var token = 'thr1.AAAAAGiNH5hLLJwiOkRVbQ.y4LGvzqOIl0';
var roomLink = '';
var gameTime = 7;
var map = 'RSR';
var superAdmins = ['Rei Falcão'];
// Compatibilidade de execucao: se HBInit estiver disponivel (execucao standalone), usar HBInit
// caso contrario o Server.open fornece 'room' no contexto da execucao.
if (typeof HBInit === 'function' && typeof room === 'undefined') {
  // Criar sala usando HBInit (modo standalone)
  room = HBInit({
    roomName: roomName,
    password: roomPassword,
    maxPlayers: maxPlayers,
    public: roomPublic,
    geo: { code: 'BR', lat: -19.816, lon: -43.99 },
    noPlayer: true,
    token: token,
  });
} else {
  // room e fornecida automaticamente pelo contexto quando executado via server.open
}
// para compatibilidade com execucao standalone, se desejar executar o script localmente,
// o framework haxball.js retorna HBInit() para criar a sala. Aqui, assumimos que
// `room` ja esta disponivel no contexto (Server.open injeta a instancia).

class Game {
  constructor() {
    this.time = 0;
    this.paused = false;
    this.ballRadius;
    this.rsTouchTeam = 0;
    this.rsActive = true;
    this.rsReady = false;
    this.rsCorner = false;
    this.rsGoalKick = false;
    this.rsFoul = false;
    this.rsSwingTimer = 1000;
    this.rsTimer;
    this.rsPenalty = false;
    this.ballOutPositionX;
    this.ballOutPositionY;
    this.throwInPosY;
    this.outStatus = '';
    this.warningCount = 0;
    this.bringThrowBack = false;
    this.extraTime = false;
    this.extraTimeCount = 0;
    this.extraTimeEnd;
    this.extraTimeAnnounced = false;
    this.lastPlayAnnounced = false;
    this.boosterState;
    this.throwinKicked = false;
    this.pushedOut;
    this.lastKickerId;
    this.lastKickerName;
    this.lastKickerTeam;
    this.secondLastKickerId;
    this.secondLastKickerName;
    this.secondLastKickerTeam;
    this.redScore = 0;
    this.blueScore = 0;
    this.powershotCounter = 0;
    this.powershotID = 0;
    this.powershotTrigger = false;
    this.touchTrigger = false;
    this.airBallTrigger = false;
    this.ballInAir = false;
    this.penaltyKickerId;
  }

  updateLastKicker(id, name, team) {
    this.secondLastKickerId = this.lastKickerId;
    this.secondLastKickerName = this.lastKickerName;
    this.secondLastKickerTeam = this.lastKickerTeam;

    this.lastKickerId = id;
    this.lastKickerName = name;
    this.lastKickerTeam = team;
  }
}

room.setCustomStadium(getRealSoccerMap());
room.setScoreLimit(0);
room.setTimeLimit(10);

room.onRoomLink = function (url) {
  console.log(url);
  // When the room link changes (server restarted/hosted), ensure map is set to RSR custom map
  if (map == 'RSR') {
    room.setCustomStadium(getRealSoccerMap());
  }
};

room.onStadiumChange = function (newStadiumName, byPlayer) {
  if (byPlayer != null) {
    map = 'custom';
  } else {
    map = 'RSR';
  }
  fieldWidth = currentStadium.bg.width;
  fieldHeight = currentStadium.bg.height;
  fieldWidthLimit = fieldWidth + 11.45;
  fieldHeightLimit = fieldHeight + 11.45;
};

room.onPlayerJoin = function (player) {
  console.log(player.name + ' joined the room');
  whisper('Ola, seja bem vindo a CIRS! Um servidor de Real Soccer', player.id, 0x61ddff, 'bold', 0);
  whisper(' ██████╗██╗██████╗ ███████╗ ', player.id, 0x61ddff, 'bold', 0);
  whisper('██ ╔═══╝██║██╔══██╗██╔════╝ ', player.id, 0x61ddff, 'bold', 0);
  whisper('██ ║    	    ██║██████╔╝███████╗ ', player.id, 0x61ddff, 'bold', 0);
  whisper('██ ║    	    ██║██╔══██╗╚════██║ ', player.id, 0x61ddff, 'bold', 0);
  whisper(' ██████╗██║██║     ██║███████║ ', player.id, 0x61ddff, 'bold', 0);
  whisper('Nosso discord: https://discord.gg/mWzatsxjTA', player.id, 0x61e7ff, 'bold', 0);

  displayAdminMessage();
};

room.onPlayerLeave = function (player) {
  removePlayerPosition(player, player.team);
  if (map == 'RSR') updateChoosePositionMode();
  displayAdminMessage();
  console.log(player.name + ' saiu da sala');

  let index = superAdmins.indexOf(player.id);
  if (index > -1) {
    sleep(100).then(() => {
      superAdmins.splice(index, 1);
    });
  }
  delete playersOldTeam[player.id];
};

room.onPlayerAdminChange = function (changedPlayer, byPlayer) {
  if (byPlayer != null) {
    if (changedPlayer.id != byPlayer.id) {
      if (superAdmins.indexOf(changedPlayer.id) > -1) {
        room.kickPlayer(byPlayer.id, 'You cannot remove a Super Admin', false);
        room.setPlayerAdmin(changedPlayer.id, true);
      }
    } else {
      if (changedPlayer.admin == false) {
        let index = superAdmins.indexOf(changedPlayer.id);
        if (index > -1) {
          superAdmins.splice(index, 1);
        }
      }
    }
  }
};

room.onGameStart = function (byPlayer) {
  gamePaused = false;
  if (map == 'RSR') {
    room.setDiscProperties(0, { invMass: 1.05 });
    if (byPlayer == null) {
      game = new Game();
      announce('Tempo de jogo: ' + gameTime + ' minutos');
      positionThePlayers();
      updateChoosePositionMode();
      if (choosePositionMode) {
        const players = room.getPlayerList().filter((p) => p.team !== 0);
        for (const player of players) {
          announce(
            `Posicoes disponiveis: ${getAvailablePositions(player.team).join(', ')}`,
            player.id
          );
        }
      }
    } else {
      if (room.getScores().timeLimit != 0) {
        gameTime = room.getScores().timeLimit / 60;
      } else {
        gameTime = 10;
      }
      room.stopGame();
      room.setTimeLimit(0);
      room.startGame();
    }
  }
};

room.onGameStop = function (byPlayer) {
  offsidePlayersIDs = [];
  playersPosOnOffside = {};
  ballPosOnOffside = {};
  isSleeping = false;
  if (map == 'RSR') {
    updateChoosePositionMode();
    if (byPlayer != null) {
      room.setTimeLimit(gameTime);
    }
  }
};

let gamePaused = false,
  unpauseTimeout;
room.onGamePause = function (byPlayer) {
  if (byPlayer != null) {
    room.sendAnnouncement(`Jogo pausado por ${byPlayer.name}!`, null, null, 'bold', 0);
  } else if (!game.rsFoul) {
    if (choosePositionMode) return room.pauseGame(true);
    room.sendAnnouncement(`Jogo pausado!`, null, null, 'bold', 0);
  }
  clearTimeout(unpauseTimeout);
  gamePaused = true;
};

room.onGameUnpause = function (byPlayer) {
  if (choosePositionMode) return room.pauseGame(true);
  unpauseTimeout = setTimeout(() => {
    gamePaused = false;
  }, 2000);
  if (byPlayer != null) {
    room.sendAnnouncement(`Jogo despausado por ${byPlayer.name}!`, null, null, 'bold', 0);
  } else if (!game.rsFoul) {
    room.sendAnnouncement(`Jogo despausado!`, null, null, 'bold', 0);
  }
};

function shouldCheckOffside(player) {
  if (game.outStatus !== '' || game.rsPenalty) {
    return false;
  }
  return true;
}

let offsidePlayersIDs = [],
  playersPosOnOffside = {},
  ballPosOnOffside = {},
  _2ndLastDefenderID,
  handlingOffside = false;
async function checkOffside(player, isKick) {
  if (!handlingOffside) {
    if (offsidePlayersIDs.includes(player.id)) {
      handlingOffside = true;
      offsidePlayersIDs = [];
      room.pauseGame(true);
      for (const playerId in playersPosOnOffside) {
        room.setPlayerDiscProperties(playerId, {
          ...playersPosOnOffside[playerId],
          xspeed: 0,
          yspeed: 0,
          invMass: 9999999,
        });
      }
      if (
        (player.team == 1 && ballPosOnOffside.x > playersPosOnOffside[_2ndLastDefenderID].x) ||
        (player.team == 2 && ballPosOnOffside.x < playersPosOnOffside[_2ndLastDefenderID].x)
      ) {
        room.setDiscProperties(16, {
          x: player.team == 1 ? ballPosOnOffside.x + 8.25 : ballPosOnOffside.x - 8.25,
          y: fieldHeightLimit,
        });
        room.setDiscProperties(17, {
          x: player.team == 1 ? ballPosOnOffside.x + 8.25 : ballPosOnOffside.x - 8.25,
          y: -fieldHeightLimit,
        });
        room.setDiscProperties(18, {
          x:
            player.team == 1
              ? playersPosOnOffside[player.id].x + 15
              : playersPosOnOffside[player.id].x - 15,
          y: fieldHeightLimit,
        });
        room.setDiscProperties(19, {
          x:
            player.team == 1
              ? playersPosOnOffside[player.id].x + 15
              : playersPosOnOffside[player.id].x - 15,
          y: -fieldHeightLimit,
        });
      } else {
        room.setDiscProperties(16, {
          x:
            player.team == 1
              ? playersPosOnOffside[_2ndLastDefenderID].x + 15
              : playersPosOnOffside[_2ndLastDefenderID].x - 15,
          y: fieldHeightLimit,
        });
        room.setDiscProperties(17, {
          x:
            player.team == 1
              ? playersPosOnOffside[_2ndLastDefenderID].x + 15
              : playersPosOnOffside[_2ndLastDefenderID].x - 15,
          y: -fieldHeightLimit,
        });
        room.setDiscProperties(18, {
          x:
            player.team == 1
              ? playersPosOnOffside[player.id].x + 15
              : playersPosOnOffside[player.id].x - 15,
          y: fieldHeightLimit,
        });
        room.setDiscProperties(19, {
          x:
            player.team == 1
              ? playersPosOnOffside[player.id].x + 15
              : playersPosOnOffside[player.id].x - 15,
          y: -fieldHeightLimit,
        });
        room.setDiscProperties(0, {
          xspeed: 0,
          yspeed: 0,
          xgravity: 0,
          ygravity: 0,
          x: ballPosOnOffside.x,
          y: ballPosOnOffside.y,
        });
      }
      room.setDiscProperties(0, {
        xspeed: 0,
        yspeed: 0,
        xgravity: 0,
        ygravity: 0,
        x: ballPosOnOffside.x,
        y: ballPosOnOffside.y,
      });
      room.sendAnnouncement(`${player.name} nao estava em posicao legal. Impedimento marcado!`);
      await sleep(3000).then(() => {
        room.pauseGame(false);
        room.setDiscProperties(16, { x: 10000, y: fieldHeightLimit });
        room.setDiscProperties(17, { x: 10000, y: fieldHeightLimit });
        room.setDiscProperties(18, { x: 10000, y: fieldHeightLimit });
        room.setDiscProperties(19, { x: 10000, y: fieldHeightLimit });
        room.setPlayerDiscProperties(player.id, {
          x:
            player.team == 1
              ? playersPosOnOffside[player.id].x - 35
              : playersPosOnOffside[player.id].x + 35,
        });
        room.setDiscProperties(0, {
          xspeed: 0,
          yspeed: 0,
          x: playersPosOnOffside[player.id].x,
          y: playersPosOnOffside[player.id].y,
        });
        room.setDiscProperties(3, {
          x: playersPosOnOffside[player.id].x,
          y: playersPosOnOffside[player.id].y,
          radius: 18,
        });
        room.setDiscProperties(player.team == 1 ? 1 : 2, {
          x: playersPosOnOffside[player.id].x,
          y: playersPosOnOffside[player.id].y,
          radius: 210,
        });
      });
      playersPosOnOffside = {};
      ballPosOnOffside = {};
      handlingOffside = false;
      game.rsActive = false;
      game.rsReady = true;
      game.rsFoul = true;
      sleep(2000).then(() => {
        room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
      });
    } else if (isKick) {
      offsidePlayersIDs = [];
      playersPosOnOffside = {};
      ballPosOnOffside = {};
      if (shouldCheckOffside(player)) {
        const redPlayers = room.getPlayerList().filter((p) => p.team == 1);
        const bluePlayers = room.getPlayerList().filter((p) => p.team == 2);
        const ballPosition = room.getBallPosition();
        if (redPlayers.length > 1 && bluePlayers.length > 1) {
          player.team == 1
            ? bluePlayers.sort((a, b) => a.position.x - b.position.x)
            : redPlayers.sort((a, b) => b.position.x - a.position.x);
          const _2ndLastDefender =
            player.team == 1
              ? bluePlayers[bluePlayers.length - 2]
              : redPlayers[redPlayers.length - 2];
          _2ndLastDefenderID = _2ndLastDefender.id;
          const offsidePlayers =
            player.team == 1
              ? redPlayers.filter(
                  (p) =>
                    p.id !== player.id &&
                    p.position.x > -15 &&
                    p.position.x > _2ndLastDefender.position.x &&
                    p.position.x > ballPosition.x
                )
              : bluePlayers.filter(
                  (p) =>
                    p.id !== player.id &&
                    p.position.x < 15 &&
                    p.position.x < _2ndLastDefender.position.x &&
                    p.position.x < ballPosition.x
                );
          offsidePlayersIDs = offsidePlayers.map((p) => p.id);
          if (offsidePlayersIDs.length > 0) {
            const players = room.getPlayerList().filter((p) => p.team !== 0);
            players.forEach((p) => {
              playersPosOnOffside[p.id] = p.position;
            });
            ballPosOnOffside = ballPosition;
          }
        }
      }
    }
  }
}

room.onPlayerBallKick = function (player) {
  if (map == 'RSR') {
    game.rsTouchTeam = player.team;
    game.updateLastKicker(player.id, player.name, player.team);

    //=========== POWERSHOT CODE ===========
    if (powerShotMode == true) {
      if (room.getDiscProperties(0).color !== 0xffffff && game.outStatus == '') {
        room.setDiscProperties(0, {
          xgravity: -room.getPlayerDiscProperties(player.id).yspeed / 30,
          ygravity: -room.getPlayerDiscProperties(player.id).yspeed / 30,
        });
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsSwingTimer = 50;
      }
      game.powershotCounter = 0;
      game.powershotID = 0;
      game.powershotTrigger = false;
      if (game.airBallTrigger && !game.ballInAir) {
        const ball_cMask = room.getDiscProperties(0).cMask;
        room.setDiscProperties(0, { cMask: ball_cMask - 7, invMass: 1.05 }); // ball + red + blue = 7
        game.ballInAir = true;
        sleep(2000).then(() => {
          room.setDiscProperties(0, { cMask: ball_cMask, invMass: 1.05 });
          game.airBallTrigger = false;
          game.ballInAir = false;
        });
      } else if (parseFloat(room.getDiscProperties(0).invMass.toFixed(2)) != 1.05) {
        room.setDiscProperties(0, { invMass: 1.05 });
      }
    }
    //=========== POWERSHOT CODE ===========

    checkOffside(player, true);

    if (game.rsReady == true) {
      var players = room.getPlayerList().filter((player) => player.team != 0);
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass.toFixed(1) != 0.3) {
          room.setPlayerDiscProperties(player.id, { invMass: 0.3 });
        }
      });
    }

    if (game.rsActive == false && game.rsReady == true) {
      // make game active on kick from CK/GK
      if (game.rsCorner == true || game.rsGoalKick == true) {
        game.boosterState = true;

        room.setDiscProperties(1, { x: 2000, y: 2000 });
        room.setDiscProperties(2, { x: 2000, y: 2000 });
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsTimer = 1000000;
        game.warningCount++;

        // set gravity for real soccer corners/goalkicks
        if (game.rsCorner == true) {
          room.setDiscProperties(0, {
            xgravity: (room.getPlayerDiscProperties(player.id).xspeed / 16) * -1,
            ygravity: (room.getPlayerDiscProperties(player.id).yspeed / 16) * -1,
          });
        }
        if (game.rsGoalKick == true) {
          room.setDiscProperties(0, {
            xgravity: 0,
            ygravity: (room.getPlayerDiscProperties(player.id).yspeed / 20) * -1,
          });
        }

        game.rsCorner = false;
        game.rsGoalKick = false;
        game.outStatus = '';

        room.setDiscProperties(0, { cMask: room.getDiscProperties(0).cMask - 7 }); // remove a colisão da bola com os jogadores
        game.ballInAir = true;
        sleep(2000).then(() => {
          // tempo até que a bola volte a colidir com os jogadores
          room.setDiscProperties(0, { cMask: 63 });
          game.ballInAir = false;
        });
      }
      if (game.outStatus == 'redThrow' || game.outStatus == 'blueThrow') {
        game.outStatus = '';
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsTimer = 1000000;
        game.warningCount++;

        room.setDiscProperties(0, { cMask: room.getDiscProperties(0).cMask - 7 }); // remove a colisão da bola com os jogadores
        game.ballInAir = true;
        sleep(2000).then(() => {
          // tempo até que a bola volte a colidir com os jogadores
          room.setDiscProperties(0, { cMask: 63 });
          game.ballInAir = false;
        });
      }
      if (game.rsFoul == true || game.rsPenalty == true) {
        game.rsFoul = false;
        game.rsPenalty = false;
        room.setDiscProperties(player.team == 1 ? 2 : 1, { x: 2000, y: 2000, radius: 0 });
      }
      game.rsActive = true;
      game.rsReady = false;
    }
  }
};

room.onPlayerKicked = function (kickedPlayer, reason, ban, byPlayer) {
  if (superAdmins.indexOf(kickedPlayer.id) > -1 && byPlayer != null) {
    room.kickPlayer(byPlayer.id, 'You cannot kick/ban a Super Admin', false);
    room.clearBans();
  }
};

function changeFormation(player, formation, team) {
  if (positions[formation]) {
    console.log(`Mudando formação para: ${formation}`);
    //activeFormation = formation;
    if (team == 1) {
      activeFormation_red = formation;
      teamPositions[1] = { ...positions[activeFormation_red] };
      for (var pos in teamPositions[1]) {
        teamPositions[1][pos].x = -Math.abs(teamPositions[1][pos].x);
      }
    } else if (team == 2) {
      activeFormation_blue = formation;
      teamPositions[2] = { ...positions[activeFormation_blue] }; // Ambos os times compartilham a mesma formação
      for (var pos in teamPositions[2]) {
        teamPositions[2][pos].x = Math.abs(teamPositions[2][pos].x);
      }
    }

    room.sendAnnouncement(`O time ${team} mudou para a formação ${formation}`);
    if (choosePositionMode) {
      const players = room.getPlayerList().filter((p) => p.team !== 0);
      for (const player of players) {
        announce(
          `Posições disponíveis: ${getAvailablePositions(player.team).join(', ')}`,
          player.id
        );
      }
    }
    positionThePlayers();
  } else {
    console.error(`Formação ${formation} não existe.`);
    room.sendAnnouncement(`A formação ${formation} não existe.`);
  }
}

var sala_mutada = false;

room.onPlayerChat = function (player, message) {
  // normalize input
  if (typeof message !== 'string') return false;
  message = message.trim();
  // determine if its a command that starts with '!'
  const isCommandPrompt = message.startsWith('!');
  const incoming = isCommandPrompt ? message.substr(1).trim() : message; // remove leading '!'
  let args = incoming.split(/\s+/);

  let activeFormation = activeFormation_red;
  if (player.team == 2) activeFormation = activeFormation_blue;

  // Block chat if in choosePositionMode and message is not a command nor a position, or if the room is muted and player is not admin
  const isPositionChoice = Object.keys(positions[activeFormation]).includes(args[0].toUpperCase());
  if (
    (choosePositionMode && !isCommandPrompt && !isPositionChoice) ||
    (sala_mutada && !player.admin)
  )
    return false;
  console.log(player.name + ': ' + message);

  // Handle position selection without the need of '!'
  if (!isCommandPrompt && isPositionChoice && player.team !== 0) {
    if (choosePositionMode) {
      setPlayerPosition(player, player.team, args[0].toUpperCase());
      return false;
    }
  }
  // If it's a command, process it
  if (isCommandPrompt) {
    // unify lowercase command
    const cmd = args[0].toLowerCase();
    // handle formation command: !formacao [red|blue] [formation]
    if ((cmd === 'formacao' || cmd === 'formacao') && args.length >= 3 && player.admin) {
      const teamStr = args[1].toLowerCase();
      const formation = args[2].toLowerCase();
      if (teamStr === 'red') changeFormation(player, formation, 1);
      else if (teamStr === 'blue') changeFormation(player, formation, 2);
      return false;
    }

    // old behavior: convert to previous args usage
    message = incoming;
    args = message.split(' ');
    let activeForm = activeFormation;
    if (Object.keys(positions[activeForm]).includes(args[0].toUpperCase()) && player.team !== 0) {
      const position = args[0].toUpperCase();
      if (choosePositionMode) {
        setPlayerPosition(player, player.team, position);
      }
    } else if (cmd == 'rpos' && player.team !== 0) {
      if (choosePositionMode)
        room.sendAnnouncement(`Você removeu sua posição.`, player.id),
          removePlayerPosition(player, player.team);
      else room.sendAnnouncement('Você não pode remover posição neste momento.', player.id);
    } else if (cmd == 'admin' && args.length == 1 && allowPublicAdmin == true) {
      if (isAdminPresent() == false) {
        room.setPlayerAdmin(player.id, true);
      } else {
        whisper('O Admin já está na sala ou o comando !admin não está permitido', player.id);
      }
    } else if (cmd == 'admin' && args.length == 2) {
      if (args[1] == superAdminCode) {
        room.setPlayerAdmin(player.id, true);
        if (superAdmins.indexOf(player.id) === -1) {
          superAdmins.push(player.id);
        }
        announce(player.name + ' pegou Super Admin!');
      }
    } else if (cmd == 'clearbans') {
      if (player.admin) {
        room.clearBans();
        announce('Os bans foram retirados por: ' + player.name);
      } else {
        whisper('Apenas admins podem usar este comando', player.id);
      }
    } else if (cmd == 'court' && args.length == 1) {
      whisper('A cor do fundo do estádio atualmente é ' + mapBGColor);
    } else if (cmd == 'court' && args.length == 2 && player.admin) {
      if (room.getScores() == null) {
        if (args[1] == 'reset') {
          mapBGColor = '86A578';
          announce('Cor do fundo do mapa resetada por: ' + player.name);
        } else {
          mapBGColor = args[1];
          announce('Cor do fundo do mapa colocada como: ' + args[1] + ' por ' + player.name);
        }
        room.setCustomStadium(getRealSoccerMap());
      } else {
        whisper('Não é possível mudar a cor do mapa durante o jogo.', player.id);
      }
    } else if (cmd == 'swap') {
      if (player.admin) {
        if (args.length == 1) {
          var players = room.getPlayerList().filter((player) => player.id != 0);
          if (players.length == 0) return false;
          players.forEach(function (player) {
            if (player.team == 1) {
              room.setPlayerTeam(player.id, 2);
            }
            if (player.team == 2) {
              room.setPlayerTeam(player.id, 1);
            }
          });
          announce('Times foram trocados');
        }
      } else {
        whisper('Comando apenas de Admin', player.id);
      }
    } else if (cmd == 'setpassword' && player.admin) {
      if (superAdmins.indexOf(player.id) > -1) {
        room.setPassword(args[1]);
        roomPassword = args[1];
        announce('Senha foi trocada por: ' + player.name);
      } else {
        whisper('Apenas super admins podem mudar a senha.', player.id);
      }
    } else if (cmd == 'clearpassword' && player.admin) {
      if (superAdmins.indexOf(player.id) > -1) {
        room.setPassword(null);
        roomPassword = null;
        announce('Senha foi retirada por: ' + player.name);
      } else {
        whisper('Apenas super admins podem tirar a senha.', player.id);
      }
    } else if (cmd == 'rs' && player.admin) {
      if (room.getScores() == null) {
        room.setCustomStadium(getRealSoccerMap());
      } else {
        whisper('Não é possível mudar o mapa durante o jogo.', player.id);
      }
    } else if (cmd == 'rr' && player.admin) {
      room.stopGame();
      room.startGame();
    } else if (cmd == 'bb') {
      room.kickPlayer(player.id, 'Bye', false);
    } else if ((cmd == 'powershot' || cmd == 'ps') && player.admin) {
      if (powerShotMode == false) {
        powerShotMode = true;
        announce('MODO DE POWERSHOT ATIVADO POR ' + player.name, null, 0x00ff00);
      } else {
        powerShotMode = false;
        announce('MODO DE POWERSHOT DESATIVADO POR ' + player.name, null, 0xff0000);
      }
    } else if (cmd == 'help') {
      displayHelp(player.id, args[1]);
    } else if (cmd == 'super') {
      let superMsg = 'Super Admins: ';
      superAdmins.forEach(function (id) {
        if (room.getPlayer(id) != null || room.getPlayer(id) != undefined) {
          superMsg = superMsg + room.getPlayer(id).name + ', ';
        }
      });
      if (superAdmins.length > 0) {
        superMsg = superMsg.slice(0, -2);
      } else {
        superMsg = 'Não tem super admins presentes.';
      }
      whisper(superMsg, player.id);
    } else if (cmd == 'penal' && ['red', 'v'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsPenalty = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(3, { x: penalMark, y: 0, radius: 18 });
      room.setDiscProperties(0, {
        invMass: 1.8,
        x: penalMark,
        y: 0,
        xspeed: 0,
        yspeed: 0,
        color: '0xff3f34',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Pênalti para o red!');
      /*sleep(5000).then(() => {
				room.setDiscProperties(3, {x: 0, y: 2000, radius: 0});
			});*/
    } else if (cmd == 'penal' && ['blue', 'a'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsPenalty = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(3, { x: -penalMark, y: 0, radius: 18 });
      room.setDiscProperties(0, {
        invMass: 1.8,
        x: -penalMark,
        y: 0,
        xspeed: 0,
        yspeed: 0,
        color: '0x0fbcf9',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Pênalti para o blue!');
      /*sleep(5000).then(() => {
				room.setDiscProperties(3, {x: 0, y: 2000, radius: 0});
			});*/
    } else if (cmd == 'falta' && ['red', 'v'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsFoul = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      const ballPosition = room.getBallPosition();
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(1, { x: 2000, y: 2000, radius: 0 });
      room.setDiscProperties(2, { x: ballPosition.x, y: ballPosition.y, radius: 210 });
      room.setDiscProperties(0, {
        invMass: 1.05,
        x: ballPosition.x,
        y: ballPosition.y,
        xspeed: 0,
        yspeed: 0,
        color: '0xffffff',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Falta para o red!');
    } else if (cmd == 'falta' && ['blue', 'a'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsFoul = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      const ballPosition = room.getBallPosition();
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(2, { x: 2000, y: 2000, radius: 0 });
      room.setDiscProperties(1, { x: ballPosition.x, y: ballPosition.y, radius: 210 });
      room.setDiscProperties(0, {
        invMass: 1.05,
        x: ballPosition.x,
        y: ballPosition.y,
        xspeed: 0,
        yspeed: 0,
        color: '0xffffff',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Falta para o blue!');
    } else if (cmd == 'atr') {
      room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
      room.sendAnnouncement('Autorizado!');
    } else if (args[0] == 'mutarsala' && player.admin) {
      if (sala_mutada) {
        sala_mutada = false;
        room.sendAnnouncement('A sala foi desmutada.', null, vermelho, 'bold', 2);
      } else {
        sala_mutada = true;
        room.sendAnnouncement('A sala foi mutada.', null, verde, 'bold', 2);
      }
    } else if (args[0] == 'discord') {
      room.sendAnnouncement(
        'Link do discord:Discord CIRS: https://discord.gg/mWzatsxjTA | Discord Parceiros: https://discord.gg/mWzatsxjTA ',
        player.id,
        verde,
        'bold',
        1
      );
    }
    return false;
  }
  if (message.startsWith('t ')) {
    teamMsg = message.substring(1).trim();
    if (player.team == 1) {
      var players = room.getPlayerList().filter((player) => player.team == 1);
      players.forEach(function (teamPlayer) {
        room.sendAnnouncement(
          '[Team] ' + player.name + ': ' + teamMsg,
          teamPlayer.id,
          0xed6a5a,
          'normal',
          1
        );
      });
    }
    if (player.team == 2) {
      var players = room.getPlayerList().filter((player) => player.team == 2);
      players.forEach(function (teamPlayer) {
        room.sendAnnouncement(
          '[Team] ' + player.name + ': ' + teamMsg,
          teamPlayer.id,
          0x5995ed,
          'normal',
          1
        );
      });
    }
    if (player.team == 0) {
      var players = room.getPlayerList().filter((player) => player.team == 0);
      players.forEach(function (teamPlayer) {
        room.sendAnnouncement(
          '[Spec] ' + player.name + ': ' + teamMsg,
          teamPlayer.id,
          0xdee7fa,
          'normal',
          1
        );
      });
    }
    return false;
  }
  if (message.startsWith('@@')) {
    message = message.substr(2).trim();
    if (message.indexOf(' ') !== -1) {
      let args = message.match(/^(\S+)\s(.*)/).slice(1);

      if (args.length > 1) {
        var pmMsg = args[1];
        var players = room.getPlayerList();
        var pmSent = false;
        players.forEach(function (pmPlayer) {
          if (pmPlayer.name === args[0] || pmPlayer.name === args[0].replace(/_/g, ' ')) {
            whisper(
              '[PM > ' + pmPlayer.name + '] ' + player.name + ': ' + pmMsg,
              player.id,
              0xffa220,
              'normal',
              1
            );
            whisper('[PM] ' + player.name + ': ' + pmMsg, pmPlayer.id, 0xffa220, 'normal', 1);
            pmSent = true;
          }
        });
        if (pmSent == false) {
          whisper(
            "Impossível encontrar usuário '" + args[0] + "'",
            player.id,
            0xffa220,
            'normal',
            1
          );
        }
        return false;
      }
    }
  }
};

function displayHelp(id, selection) {
  if (selection == null) {
    whisper(
      'Commands: @@[mensagens no privado de alguém, ex: @@urugay[mensagem]], !rs, !rr, !bb, !powershot, !ps, !admin, !setpassword, !clearpassword, !super, !clearbans, !swap, t [team chat msg], !court, !court [hexcolor], !court reset',
      id,
      null,
      'small'
    );
  }
}

const positions = {
  red: {
    GK: { x: -1595, y: 0, radius: 18 },
    ZD: { x: -1150, y: 180 },
    ZE: { x: -1150, y: -180 },
    MC: { x: -650, y: 0 },
    PD: { x: -350, y: 650 },
    PE: { x: -350, y: -650 },
    CA: { x: -300, y: 0 },
  },
  blue: {},
};

// Adicione uma nova formação (green) ao objeto positions
positions.f231 = {
  GK: { x: -1595, y: 0, radius: 18 },
  ZD: { x: -1150, y: 180 },
  ZE: { x: -1150, y: -180 },
  VL: { x: -600, y: 100 },
  V2: { x: -550, y: -100 },
  MA: { x: -500, y: 0 },
  CA: { x: -300, y: 0 },
};

positions.f321 = {
  GK: { x: -1595, y: 0, radius: 18 },
  ZD: { x: -1150, y: 180 },
  ZE: { x: -1150, y: -180 },
  ZC: { x: -1150, y: 0 },
  VE: { x: -550, y: -100 },
  VD: { x: -550, y: 100 },
  CA: { x: -300, y: 0 },
};

positions.f2211 = {
  GK: { x: -1595, y: 0, radius: 18 },
  ZD: { x: -1150, y: 180 },
  ZE: { x: -1150, y: -180 },
  MD: { x: -550, y: 300 },
  ME: { x: -550, y: -300 },
  MC: { x: -450, y: 0 },
  CA: { x: -300, y: 0 },
};
for (const position in positions.red) {
  positions.blue[position] = {
    ...positions.red[position],
    x: -positions.red[position].x,
    y: -positions.red[position].y,
  };
}

let activeFormation_red = 'red';
let activeFormation_blue = 'blue';
let choosePositionMode = false,
  teamPositions = {
    1: { ...positions.red },
    2: { ...positions.blue },
  },
  playersPositions = {};

function updateChoosePositionMode() {
  console.log('updateChoosePositionMode called');

  if (room.getScores() !== null) {
    const playersWithoutPosition = getPlayersWithoutPosition();
    console.log(
      'Players without position:',
      playersWithoutPosition.map((p) => p.name)
    );

    if (playersWithoutPosition.length > 0) {
      if (!choosePositionMode) {
        room.pauseGame(true);
        choosePositionMode = true;
        console.log('choosePositionMode set to true');
      }
    } else if (choosePositionMode) {
      choosePositionMode = false;
      room.pauseGame(false);
      console.log('choosePositionMode set to false');
    }
  } else if (choosePositionMode) {
    choosePositionMode = false;
    console.log('choosePositionMode set to false (scores are null)');
  }
}

function isPositionAvailable(team, position) {
  return teamPositions[team][position];
}

function getAvailablePositions(team) {
  return Object.keys(positions.red).filter((position) => teamPositions[team][position]);
}

function getPlayersWithoutPosition() {
  return room.getPlayerList().filter((player) => player.team !== 0 && !playersPositions[player.id]);
}

async function setPlayerPosition(player, team, position) {
  if (isPositionAvailable(team, position)) {
    if (playersPositions[player.id]) {
      teamPositions[team][playersPositions[player.id]] =
        positions[team == 1 ? 'red' : 'blue'][playersPositions[player.id]];
    }
    playersPositions[player.id] = position;

    teamPositions[team][position].x = Math.abs(teamPositions[team][position].x);

    if (team == 1) {
      teamPositions[team][position].x = -teamPositions[team][position].x;
    }

    position == 'GK'
      ? room.setPlayerDiscProperties(player.id, teamPositions[team][position])
      : room.setPlayerDiscProperties(player.id, { ...teamPositions[team][position], radius: 15 });
    delete teamPositions[team][position];
    room.setPlayerAvatar(player.id, position);
    room.sendAnnouncement(`Você escolheu a posição ${position}`, player.id);
    const playersOnSameTeam = room.getPlayerList().filter((p) => p.team == team);
    for (const p of playersOnSameTeam) {
      await announce(`Posições disponíveis: ${getAvailablePositions(team).join(', ')}`, p.id);
    }
    updateChoosePositionMode();
  } else {
    room.sendAnnouncement(
      `A posição ${position} não está disponível no seu time.\nPosições disponíveis: ${getAvailablePositions(
        team
      ).join(', ')}`,
      player.id
    );
  }
}

// Função que remove uma posição atribuída a um jogador de um determinado time
function removePlayerPosition(player, team) {
  const position = playersPositions[player.id];
  if (!position) return;
  if (!isPositionAvailable(team, position)) {
    // Se o jogador tem essa posição, libere essa posição
    teamPositions[team][position] = positions[team == 1 ? 'red' : 'blue'][position];
    delete playersPositions[player.id];
    room.setPlayerAvatar(player.id);
    if (choosePositionMode) {
      const playersOnSameTeam = room.getPlayerList().filter((p) => p.team == team);
      for (const p of playersOnSameTeam) {
        announce(`Posições disponíveis: ${getAvailablePositions(team).join(', ')}`, p.id);
      }
    }
  }
}

function getAvailablePositions(team) {
  let activeFormation = activeFormation_red;

  if (team == 2) {
    activeFormation = activeFormation_blue;
  }

  return Object.keys(positions[activeFormation]).filter(
    (position) => teamPositions[team][position]
  );
}

function positionThePlayers() {
  console.log('positionThePlayers called');
  const redPlayers = room.getPlayerList().filter((p) => p.team == 1);
  const bluePlayers = room.getPlayerList().filter((p) => p.team == 2);

  console.log('Red Players:', redPlayers.map((p) => p.name).join(', '));
  console.log('Blue Players:', bluePlayers.map((p) => p.name).join(', '));

  if (redPlayers.length == 7) {
    for (const player of redPlayers) {
      const playerPosition = playersPositions[player.id];
      if (!playerPosition) continue;
      console.log(`Setting position for ${player.name} to ${playerPosition}`);
      playerPosition == 'GK'
        ? room.setPlayerDiscProperties(player.id, positions.red[playerPosition])
        : room.setPlayerDiscProperties(player.id, { ...positions.red[playerPosition], radius: 15 });
    }
  }

  if (bluePlayers.length == 7) {
    for (const player of bluePlayers) {
      const playerPosition = playersPositions[player.id];
      if (!playerPosition) continue;
      console.log(`Setting position for ${player.name} to ${playerPosition}`);
      playerPosition == 'GK'
        ? room.setPlayerDiscProperties(player.id, positions.blue[playerPosition])
        : room.setPlayerDiscProperties(player.id, {
            ...positions.blue[playerPosition],
            radius: 15,
          });
    }
  }
}

let playersOldTeam = {};
room.onPlayerTeamChange = function (changedPlayer, byPlayer) {
  removePlayerPosition(changedPlayer, playersOldTeam[changedPlayer.id]);
  if (map == 'RSR') {
    if (room.getScores() != null) {
      updateChoosePositionMode();
      if (choosePositionMode && changedPlayer.team !== 0)
        announce(
          `Posições disponíveis: ${getAvailablePositions(changedPlayer.team).join(', ')}`,
          changedPlayer.id
        );
      if (game.rsActive == false) {
        if (
          game.rsGoalKick == true ||
          game.rsCorner == true ||
          game.rsFoul == true ||
          game.rsPenalty == true
        ) {
          room.setPlayerDiscProperties(changedPlayer.id, { invMass: 9999999 });
        }
      }
    }
  }
  playersOldTeam[changedPlayer.id] = changedPlayer.team;
};

room.onTeamGoal = function (team) {
  if (map == 'RSR') {
    game.rsActive = false;

    let goalTime = secondsToMinutes(Math.floor(room.getScores().time));
    let scorer;
    let assister = '';
    let goalType;
    if (team == 1) {
      if (game.lastKickerTeam == 1) {
        //if goal type is goal
        goalType = 'GOLAÇO!';
        scorer = 'Gol de: ' + game.lastKickerName;
        if (game.secondLastKickerTeam == 1 && game.lastKickerId != game.secondLastKickerId) {
          // if assist is from teammate
          assister = ' (Assistência de: ' + game.secondLastKickerName + ')';
        }
      }
      if (game.lastKickerTeam == 2) {
        //if goal type is owngoal
        goalType = 'Gol contra mano, sério?';
        scorer = 'foi o bagre do: ' + game.lastKickerName;
        if (game.secondLastKickerTeam == 1) {
          // if owngoal was assisted
          assister = ' (Chute de: ' + game.secondLastKickerName + ')';
        }
      }
      game.redScore++;
    }
    if (team == 2) {
      if (game.lastKickerTeam == 2) {
        //if goal type is goal
        goalType = 'GOLAÇO!';
        scorer = 'Gol de: ' + game.lastKickerName;
        if (game.secondLastKickerTeam == 2 && game.lastKickerId != game.secondLastKickerId) {
          // if assist is from teammate
          assister = ' (Assistência de: ' + game.secondLastKickerName + ')';
        }
      }
      if (game.lastKickerTeam == 1) {
        //if goal type is owngoal
        goalType = 'Ala kkkkkk, gol contra!';
        scorer = 'Esses bagres estão evoluíndo... e um deles é esse: ' + game.lastKickerName;
        if (game.secondLastKickerTeam == 2) {
          // if owngoal was assisted
          assister = ' (Chute de: ' + game.secondLastKickerName + ')';
        }
      }
      game.blueScore++;
    }
    announce(
      goalType +
        ' Vermelho ' +
        game.redScore +
        ' - ' +
        game.blueScore +
        ' Azul ¦¦ Marcado aos ' +
        goalTime +
        ' ' +
        scorer +
        assister
    );
    game.lastKicker = undefined;
    game.secondLastKicker = undefined;
    game.lastKickerTeam = undefined;
    game.secondLastKickerTeam = undefined;
  }
};

room.onPositionsReset = function () {
  offsidePlayersIDs = [];
  playersPosOnOffside = {};
  ballPosOnOffside = {};
  if (map == 'RSR') {
    positionThePlayers();
    if (game.lastPlayAnnounced == true) {
      room.pauseGame(true);
      game.lastPlayAnnounced = false;
      announce('FIM DE PAPO!');
    }
  }
};

room.onGameTick = function () {
  if (map == 'RSR' && !gamePaused) {
    updateGameStatus();
    handleBallTouch();
    realSoccerRef();
    if (!game.rsActive) {
      offsidePlayersIDs = [];
      playersPosOnOffside = {};
      ballPosOnOffside = {};
    }
  }
};

function realSoccerRef() {
  blockThrowIn();
  blockGoalKick();
  removeBlock();
  if (game.time == gameTime * 60 && game.extraTimeAnnounced == false) {
    extraTime();
    game.extraTimeAnnounced = true;
  }

  if (game.time == game.extraTimeEnd && game.lastPlayAnnounced == false) {
    announce('Last play', null, null, null, 1);
    game.lastPlayAnnounced = true;
  }

  if (game.rsCorner == true || game.rsGoalKick == true) {
    //add extra time
    game.extraTimeCount++;
  }

  if (
    game.rsTimer < 99999 &&
    game.paused == false &&
    game.rsActive == false &&
    game.rsReady == true
  ) {
    game.rsTimer++;
  }

  if (game.rsSwingTimer < 150 && game.rsCorner == false && game.rsGoalKick == false) {
    game.rsSwingTimer++;
    if (game.rsSwingTimer > 5) {
      room.setDiscProperties(0, {
        xgravity: room.getDiscProperties(0).xgravity * 0,
        ygravity: room.getDiscProperties(0).ygravity * 0,
      });
    }
    if (game.rsSwingTimer == 150) {
      room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
    }
  }

  if (game.boosterState == true) {
    game.boosterCount++;
  }

  if (game.boosterCount > 30) {
    game.boosterState = false;
    game.boosterCount = 0;
    room.setDiscProperties(0, { cMask: 63 - 7 });
  }

  if (room.getBallPosition().x == 0 && room.getBallPosition().y == 0) {
    game.rsActive = true;
    game.outStatus = '';
  }

  if (game.rsActive == false && game.rsReady == true) {
    //expire barrier time
    if (game.outStatus == 'redThrow') {
      if (game.rsTimer == throwTimeOut - 120) {
        // warning indicator
        ballWarning('0xff3f34', ++game.warningCount);
      }
      if (game.rsTimer == throwTimeOut && game.bringThrowBack == false) {
        // switch to blue throw
        game.outStatus = 'blueThrow';
        game.rsTimer = 0;
        room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
        sleep(100).then(() => {
          room.setDiscProperties(0, {
            color: '0x0fbcf9',
            xspeed: 0,
            yspeed: 0,
            x: game.ballOutPositionX,
            y: game.throwInPosY,
          });
        });
      }
    } else if (game.outStatus == 'blueThrow') {
      if (game.rsTimer == throwTimeOut - 120) {
        // warning indicator
        ballWarning('0x0fbcf9', ++game.warningCount);
      }
      if (game.rsTimer == throwTimeOut && game.bringThrowBack == false) {
        // switch to red throw
        game.outStatus = 'redThrow';
        game.rsTimer = 0;
        room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
        sleep(100).then(() => {
          room.setDiscProperties(0, {
            color: '0xff3f34',
            xspeed: 0,
            yspeed: 0,
            x: game.ballOutPositionX,
            y: game.throwInPosY,
          });
        });
      }
    } else if (game.outStatus == 'blueGK' || game.outStatus == 'redGK') {
      if (game.rsTimer == gkTimeOut - 120) {
        // warning indicator
        if (game.outStatus == 'blueGK') {
          ballWarning('0x0fbcf9', ++game.warningCount);
        }
        if (game.outStatus == 'redGK') {
          ballWarning('0xff3f34', ++game.warningCount);
        }
      }
      if (game.rsTimer == gkTimeOut) {
        game.outStatus = '';
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsTimer = 1000000;
      }
    } else if (game.outStatus == 'blueCK' || game.outStatus == 'redCK') {
      if (game.rsTimer == ckTimeOut - 120) {
        if (game.outStatus == 'blueCK') {
          ballWarning('0x0fbcf9', ++game.warningCount);
        }
        if (game.outStatus == 'redCK') {
          ballWarning('0xff3f34', ++game.warningCount);
        }
      }
      if (game.rsTimer == ckTimeOut) {
        game.outStatus = '';
        room.setDiscProperties(1, { x: 0, y: 2000, radius: 0 });
        room.setDiscProperties(2, { x: 0, y: 2000, radius: 0 });
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsTimer = 1000000;
      }
    }
  }

  if (game.rsActive == true) {
    if (
      room.getBallPosition().y > fieldHeightLimit ||
      room.getBallPosition().y < -fieldHeightLimit
    ) {
      game.rsActive = false;
      if (game.lastPlayAnnounced == true) {
        room.pauseGame(true);
        game.lastPlayAnnounced = false;
        announce('FIM DE JOGO!');
      }

      room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });

      game.ballOutPositionX = Math.round(room.getBallPosition().x * 10) / 10;
      if (room.getBallPosition().y > fieldHeightLimit) {
        game.ballOutPositionY = 400485;
        game.throwInPosY = fieldHeight + 10;
      }
      if (room.getBallPosition().y < -fieldHeightLimit) {
        game.ballOutPositionY = -400485;
        game.throwInPosY = -(fieldHeight + 10);
      }
      if (room.getBallPosition().x > fieldWidth - 20) {
        game.ballOutPositionX = fieldWidth - 20;
      }
      if (room.getBallPosition().x < -(fieldWidth - 20)) {
        game.ballOutPositionX = -(fieldWidth - 20);
      }

      if (game.rsTouchTeam == 1) {
        room.setDiscProperties(3, { x: game.ballOutPositionX, y: game.throwInPosY, radius: 18 });
        sleep(100).then(() => {
          game.outStatus = 'blueThrow';
          game.throwinKicked = false;
          game.rsTimer = 0;
          game.rsReady = true;
          room.setDiscProperties(0, {
            invMass: 1.05,
            xspeed: 0,
            yspeed: 0,
            x: game.ballOutPositionX,
            y: game.throwInPosY,
            xgravity: 0,
            ygravity: 0,
          });
          //announce("Lateral para: Azul");
          room.setDiscProperties(0, { color: '0x0fbcf9' });
        });
        sleep(100).then(() => {
          room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
        });
      } else {
        room.setDiscProperties(3, { x: game.ballOutPositionX, y: game.throwInPosY, radius: 18 });
        sleep(100).then(() => {
          game.outStatus = 'redThrow';
          game.throwinKicked = false;
          game.rsTimer = 0;
          game.rsReady = true;
          room.setDiscProperties(0, {
            invMass: 1.05,
            xspeed: 0,
            yspeed: 0,
            x: game.ballOutPositionX,
            y: game.throwInPosY,
            xgravity: 0,
            ygravity: 0,
          });
          //announce("Lateral para o Vermelho");
          room.setDiscProperties(0, { color: '0xff3f34' });
        });
        sleep(100).then(() => {
          room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
        });
      }
    }

    if (
      room.getBallPosition().x > goalsCoord[0] &&
      (room.getBallPosition().y > goalsCoord[1] || room.getBallPosition().y < -goalsCoord[1])
    ) {
      game.rsActive = false;
      if (game.lastPlayAnnounced == true) {
        room.pauseGame(true);
        game.lastPlayAnnounced = false;
        announce('ACABA O JOGO!');
      }
      room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
      room.getPlayerList().forEach(function (player) {
        room.setPlayerDiscProperties(player.id, { invMass: 100000 });
      });

      if (game.rsTouchTeam == 1) {
        room.setDiscProperties(3, { x: goalKickCoord, y: 0, radius: 18 });
        sleep(100).then(() => {
          game.outStatus = 'blueGK';
          game.rsTimer = 0;
          game.rsReady = true;
          //announce("Tiro de meta para o Azul");
          game.rsGoalKick = true;
          game.rsSwingTimer = 0;
          game.boosterCount = 0;
          game.boosterState = false;
          room.setDiscProperties(0, {
            invMass: goalKickStrength,
            xspeed: 0,
            yspeed: 0,
            x: goalKickCoord,
            y: 0,
            color: '0x0fbcf9',
            cMask: 268435519,
            xgravity: 0,
            ygravity: 0,
          });
        });
        sleep(3000).then(() => {
          room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
        });
      } else {
        //announce("Escanteio para o Vermelho!");
        game.rsSwingTimer = 0;
        if (room.getBallPosition().y < -goalsCoord[1]) {
          room.setDiscProperties(3, { x: cornerKickCoord[0], y: -cornerKickCoord[1], radius: 200 });
          sleep(100).then(() => {
            game.rsCorner = true;
            game.outStatus = 'redCK';
            game.rsTimer = 0;
            game.rsReady = true;
            game.boosterCount = 0;
            game.boosterState = false;
            room.setDiscProperties(0, {
              invMass: cornerKickStrength,
              x: cornerKickCoord[0],
              y: -cornerKickCoord[1],
              xspeed: 0,
              yspeed: 0,
              color: '0xff3f34',
              cMask: 268435519,
              xgravity: 0,
              ygravity: 0,
            });
            room.setDiscProperties(2, {
              x: cornerKickCoord[0] + 10,
              y: -(cornerKickCoord[1] + 70),
              radius: 600,
            });
            room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
          });
        }
        if (room.getBallPosition().y > goalsCoord[1]) {
          room.setDiscProperties(3, { x: cornerKickCoord[0], y: cornerKickCoord[1], radius: 200 });
          sleep(100).then(() => {
            game.rsCorner = true;
            game.outStatus = 'redCK';
            game.rsTimer = 0;
            game.rsReady = true;
            game.boosterCount = 0;
            game.boosterState = false;
            room.setDiscProperties(0, {
              invMass: cornerKickStrength,
              x: cornerKickCoord[0],
              y: cornerKickCoord[1],
              xspeed: 0,
              yspeed: 0,
              color: '0xff3f34',
              cMask: 268435519,
              xgravity: 0,
              ygravity: 0,
            });
            room.setDiscProperties(2, {
              x: cornerKickCoord[0] + 10,
              y: cornerKickCoord[1] + 70,
              radius: 600,
            });
            room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
          });
        }
      }
    }
    if (
      room.getBallPosition().x < -goalsCoord[0] &&
      (room.getBallPosition().y > goalsCoord[1] || room.getBallPosition().y < -goalsCoord[1])
    ) {
      game.rsActive = false;
      if (game.lastPlayAnnounced == true) {
        room.pauseGame(true);
        game.lastPlayAnnounced = false;
        announce('SEM MAIS JOGO!');
      }
      room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
      room.getPlayerList().forEach(function (player) {
        room.setPlayerDiscProperties(player.id, { invMass: 100000 });
      });

      if (game.rsTouchTeam == 1) {
        //announce("Escanteio para o Azul!");
        game.rsSwingTimer = 0;
        if (room.getBallPosition().y < -goalsCoord[1]) {
          room.setDiscProperties(3, {
            x: -cornerKickCoord[0],
            y: -cornerKickCoord[1],
            radius: 200,
          });
          sleep(100).then(() => {
            game.rsCorner = true;
            game.outStatus = 'blueCK';
            game.rsTimer = 0;
            game.rsReady = true;
            game.boosterCount = 0;
            game.boosterState = false;
            room.setDiscProperties(0, {
              invMass: cornerKickStrength,
              x: -cornerKickCoord[0],
              y: -cornerKickCoord[1],
              xspeed: 0,
              yspeed: 0,
              color: '0x0fbcf9',
              cMask: 268435519,
              xgravity: 0,
              ygravity: 0,
            });
            room.setDiscProperties(1, {
              x: -(cornerKickCoord[0] + 10),
              y: -(cornerKickCoord[1] + 70),
              radius: 600,
            });
            room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
          });
        }
        if (room.getBallPosition().y > goalsCoord[1]) {
          room.setDiscProperties(3, { x: -cornerKickCoord[0], y: cornerKickCoord[1], radius: 200 });
          sleep(100).then(() => {
            game.rsCorner = true;
            game.outStatus = 'blueCK';
            game.rsTimer = 0;
            game.rsReady = true;
            game.boosterCount = 0;
            game.boosterState = false;
            room.setDiscProperties(0, {
              invMass: cornerKickStrength,
              x: -cornerKickCoord[0],
              y: cornerKickCoord[1],
              xspeed: 0,
              yspeed: 0,
              color: '0x0fbcf9',
              cMask: 268435519,
              xgravity: 0,
              ygravity: 0,
            });
            room.setDiscProperties(1, {
              x: -(cornerKickCoord[0] + 10),
              y: cornerKickCoord[1] + 70,
              radius: 600,
            });
            room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
          });
        }
      } else {
        room.setDiscProperties(3, { x: -goalKickCoord, y: 0, radius: 18 });
        sleep(100).then(() => {
          game.outStatus = 'redGK';
          game.rsTimer = 0;
          game.rsReady = true;
          //announce("Tiro de meta para o Vermelho!");
          game.rsGoalKick = true;
          game.rsSwingTimer = 0;
          game.boosterCount = 0;
          game.boosterState = false;
          room.setDiscProperties(0, {
            invMass: goalKickStrength,
            xspeed: 0,
            yspeed: 0,
            x: -goalKickCoord,
            y: 0,
            color: '0xff3f34',
            cMask: 268435519,
            xgravity: 0,
            ygravity: 0,
          });
        });
        sleep(3000).then(() => {
          room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
        });
      }
    }
  }
}

function handleBallTouch() {
  var players = room.getPlayerList();
  var ballPosition = room.getBallPosition();
  var ballRadius = game.ballRadius;
  var playerRadius = 15;
  var triggerDistance = ballRadius + playerRadius + 0.01;

  for (var i = 0; i < players.length; i++) {
    // Iterate over all the players
    var player = players[i];
    if (player.position == null) continue;
    playerRadius = room.getPlayerDiscProperties(player.id).radius;
    triggerDistance = ballRadius + playerRadius + 0.01;
    var distanceToBall = pointDistance(player.position, ballPosition);
    if (distanceToBall < triggerDistance) {
      checkOffside(player);
      if (!game.ballInAir) game.rsTouchTeam = player.team;
      game.throwinKicked = false;

      //=========== POWERSHOT CODE ===========
      if (
        game.rsCorner == false &&
        game.rsGoalKick == false &&
        powerShotMode == true &&
        !game.ballInAir
      ) {
        const ballColor = room.getDiscProperties(0).color;
        if (game.powershotID != player.id) {
          game.powershotID = player.id;
          game.powershotTrigger = false;
          game.powershotCounter = 0;
          game.touchTrigger = true;
        } else {
          if (game.touchTrigger) {
            if (game.outStatus == 'redThrow' || game.outStatus == 'blueThrow') {
              teamBallColor = game.outStatus == 'redThrow' ? '0xff3f34' : '0x0fbcf9';
              if (ballColor == teamBallColor || ballColor == teamBallColor) {
                room.setDiscProperties(0, { invMass: 1.5, color: '0xffe600' });
              } else {
                room.setDiscProperties(0, { invMass: 1.05, color: teamBallColor });
              }
            } else if (ballColor == '0xffffff') {
              room.setDiscProperties(0, { invMass: 1.5, color: '0xffe600' });
            } else if (
              ballColor == '0xffe600' ||
              ballColor == '0xff0000' ||
              ballColor == '0x007fff'
            ) {
              room.setDiscProperties(0, { invMass: 1.05, color: '0xffffff' });
              game.airBallTrigger = false;
            }
            game.touchTrigger = false;
          }
          if (game.outStatus !== 'redThrow' && game.outStatus !== 'blueThrow') {
            if (ballColor == '0xffffff') {
              game.powershotCounter++;
              if (
                game.powershotCounter >= 100 &&
                game.powershotTrigger == false &&
                room.getDiscProperties(0).invMass != 2.2
              ) {
                room.setDiscProperties(0, { color: 0x007fff, invMass: 2.2 });
                game.powershotTrigger = true;
                game.airBallTrigger = true;
              }
            } else if (ballColor == '0xffe600') {
              game.powershotCounter++;
              if (
                game.powershotCounter >= 100 &&
                game.powershotTrigger == false &&
                room.getDiscProperties(0).invMass != 2.8
              ) {
                room.setDiscProperties(0, { invMass: 2.8, color: '0xff0000' });
                game.powershotTrigger = true;
              }
            }
          }
        }
      }
      //=========== POWERSHOT CODE ===========

      if (game.rsCorner == false && room.getDiscProperties(0).xgravity != 0) {
        room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
        game.rsSwingTimer = 10000;
      }
    }
    //=========== POWERSHOT CODE ===========
    if (
      distanceToBall > triggerDistance + 3 &&
      player.id == game.powershotID &&
      (game.powershotTrigger || !game.touchTrigger) &&
      powerShotMode == true
    ) {
      game.powershotID = 0;
    }
    //=========== POWERSHOT CODE ===========
  }
}

function updateGameStatus() {
  game.time = Math.floor(room.getScores().time);
  game.ballRadius = room.getDiscProperties(0).radius;
}

function announce(msg, targetId, color, style, sound) {
  if (color == null) {
    color = 0xfffd82;
  }
  if (style == null) {
    style = 'bold';
  }
  if (sound == null) {
    sound = 0;
  }
  room.sendAnnouncement(msg, targetId, color, style, sound);
  console.log('Announce: ' + msg);
}

function whisper(msg, targetId, color, style, sound) {
  if (color == null) {
    color = 0x66c7ff;
  }
  if (style == null) {
    style = 'normal';
  }
  if (sound == null) {
    sound = 0;
  }
  room.sendAnnouncement(msg, targetId, color, style, sound);
  if (room.getPlayer(targetId) != null) {
    console.log('Whisper -> ' + room.getPlayer(targetId).name + ': ' + msg);
  }
}

function isAdminPresent() {
  var players = room.getPlayerList();
  if (players.find((player) => player.admin) != 'Bagrian') {
    return true;
  } else {
    return false;
  }
}

function displayAdminMessage() {
  if (isAdminPresent() == false && allowPublicAdmin == true) {
    announce('Sem admin presente, digite !admin para assumir a sala!');
  }
}

function pointDistance(p1, p2) {
  var d1 = p1.x - p2.x;
  var d2 = p1.y - p2.y;
  return Math.sqrt(d1 * d1 + d2 * d2);
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function ballWarning(origColour, warningCount) {
  sleep(200).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(400).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(600).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(800).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1000).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(1200).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1400).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(1600).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1675).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(1750).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
}

function extraTime() {
  var extraSeconds = Math.ceil(game.extraTimeCount / 60);
  game.extraTimeEnd = gameTime * 60 + extraSeconds;
  announce('Acréscimos: ' + extraSeconds + ' Seconds', null, null, null, 1);
}

function avatarCelebration(playerId, avatar) {
  room.setPlayerAvatar(playerId, avatar);
  sleep(250).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
  sleep(500).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
  sleep(750).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
  sleep(1000).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
  sleep(1250).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
  sleep(1500).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
  sleep(1750).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
  sleep(2000).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
  sleep(2250).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
  sleep(2500).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
  sleep(2750).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
  sleep(3000).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
  sleep(3250).then(() => {
    room.setPlayerAvatar(playerId, null);
  });
}

function secondsToMinutes(time) {
  // Hours, minutes and seconds
  var hrs = ~~(time / 3600);
  var mins = ~~((time % 3600) / 60);
  var secs = ~~time % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = '';
  if (hrs > 0) {
    ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
  }
  ret += '' + mins + ':' + (secs < 10 ? '0' : '');
  ret += '' + secs;
  return ret;
}

function blockThrowIn() {
  var players = room.getPlayerList().filter((player) => player.team != 0);
  if (room.getBallPosition().y < 0) {
    // top throw line
    if (game.outStatus == 'redThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).y < 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y < -(fieldHeight - 140)) {
            room.setPlayerDiscProperties(player.id, { y: -(fieldHeight - 155) });
          }
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
    if (game.outStatus == 'blueThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).y < 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y < -(fieldHeight - 140)) {
            room.setPlayerDiscProperties(player.id, { y: -(fieldHeight - 155) });
          }
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
  }
  if (room.getBallPosition().y > 0) {
    // bottom throw line
    if (game.outStatus == 'redThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).y > 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y > fieldHeight - 140) {
            room.setPlayerDiscProperties(player.id, { y: fieldHeight - 155 });
          }
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
        if (room.getDiscProperties(21).x != fieldWidth - 1) {
          // show bottom red line
          room.setDiscProperties(21, { x: fieldWidth - 1 });
        }
        if (room.getDiscProperties(23).x != -(fieldWidth - 1)) {
          // hide bottom blue line
          room.setDiscProperties(23, { x: -(fieldWidth - 1) });
        }
      });
    }
    if (game.outStatus == 'blueThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).y > 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y > fieldHeight - 140) {
            room.setPlayerDiscProperties(player.id, { y: fieldHeight - 155 });
          }
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
        if (room.getDiscProperties(23).x != fieldWidth - 1) {
          // show bottom blue line
          room.setDiscProperties(23, { x: fieldWidth - 1 });
        }
        if (room.getDiscProperties(21).x != -(fieldWidth - 1)) {
          // hide bottom red line
          room.setDiscProperties(21, { x: -(fieldWidth - 1) });
        }
      });
    }
  }
}

function blockGoalKick() {
  var players = room.getPlayerList().filter((player) => player.team != 0);
  if (room.getBallPosition().x < 0) {
    // left side red goal kick
    if (game.outStatus == 'redGK') {
      players.forEach(function (player) {
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).x < 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 268435462) {
            room.setPlayerDiscProperties(player.id, { cGroup: 268435462 });
          }
          if (
            player.position.x < -penalArea[0] &&
            player.position.y > -penalArea[1] &&
            player.position.y < penalArea[1]
          ) {
            room.setPlayerDiscProperties(player.id, { x: -(penalArea[0] - 15) });
          }
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
  }
  if (room.getBallPosition().x > 0) {
    // right side blue goal kick
    if (game.outStatus == 'blueGK') {
      players.forEach(function (player) {
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).x > 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 268435462) {
            room.setPlayerDiscProperties(player.id, { cGroup: 268435462 });
          }
          if (
            player.position.x > penalArea[0] &&
            player.position.y > -penalArea[1] &&
            player.position.y < penalArea[1]
          ) {
            room.setPlayerDiscProperties(player.id, { x: penalArea[0] - 15 });
          }
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
  }
}

function removeBlock() {
  var players = room.getPlayerList().filter((player) => player.team != 0);
  if (game.outStatus == '') {
    players.forEach(function (player) {
      if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
        room.setPlayerDiscProperties(player.id, { cGroup: 2 });
      }
      if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 4) {
        room.setPlayerDiscProperties(player.id, { cGroup: 4 });
      }
    });
  }
}

function anuncio() {
  room.sendAnnouncement('Discord CIRS: https://discord.gg/RQhSBA3k', null, azul, 'bold', 0);
}
setInterval(anuncio, 420000);

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
///    \___ \___ ) \/ (
//\_/\_(____(____|____/
