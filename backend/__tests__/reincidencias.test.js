const request = require('supertest');
const app = require('../server');
const db = require('../db');

describe('GET /api/kpi/reincidencias', () => {
  it('responde con status 200 y devuelve un array', async () => {
    const res = await request(app)
      .get('/api/kpi/reincidencias')
      .query({
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-06-18',
        propietario_red: 'todos',
      });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

afterAll(async () => {
  await db.pool.end();
});
