const request = require('supertest');
const app = require('../server');
const db = require('../db');

describe('GET /api/kpi/multiskill', () => {
  it('responde con status 200 y devuelve un array', async () => {
    const res = await request(app)
      .get('/api/kpi/multiskill')
      .query({
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31',
        propietario_red: 'todos',
      });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

afterAll(async () => {
  await db.pool.end();  // Cerramos el pool aquí para que Jest termine bien
});
