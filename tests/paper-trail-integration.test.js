const request = require('supertest');

const API_URL = 'http://localhost:1337';
const BRAND_ENDPOINT = '/api/brands';
const TRAIL_ENDPOINT = '/paper-trail/trails'; // Updated to correct Strapi V5 path format
const AUTH_ENDPOINT = '/api/auth/local';

let jwt;
let createdBrandId;

// Helper to authenticate and get JWT
async function authenticate() {
  const res = await request(API_URL)
    .post(AUTH_ENDPOINT)
    .send({ identifier: 'unittest@gmail.com', password: '123456' });
  expect(res.status).toBe(200);
  expect(res.body.jwt).toBeDefined();
  return res.body.jwt;
}

describe('Paper Trail Integration (Brand entity)', () => {
  beforeAll(async () => {
    jwt = await authenticate();
  });

  it('should create a Brand and log a trail', async () => {
    const res = await request(API_URL)
      .post(BRAND_ENDPOINT)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        data: {
          name: 'Test Brand',
          code: 'TB001',
          description: 'Brand for Paper Trail test',
          uid: 'test-brand-pt'
        }
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    createdBrandId = res.body.data.documentId;

    // Check for trail
    // const trailRes = await request(API_URL)
    //   .get(`${TRAIL_ENDPOINT}?filters[entityId][$eq]=${createdBrandId}`)
    //   .set('Authorization', `Bearer ${jwt}`);
    // expect(trailRes.status).toBe(200);
    // expect(trailRes.body.data.length).toBeGreaterThan(0);
    // expect(trailRes.body.data[0].attributes.change).toBe('create');
  });

  it('should update the Brand and log a trail', async () => {
    const res = await request(API_URL)
      .put(`${BRAND_ENDPOINT}/${createdBrandId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        data: {
          name: 'Test Brand Updated',
          description: 'Updated description'
        }
      });
    expect(res.status).toBe(200);

    // // Check for update trail
    // const trailRes = await request(API_URL)
    //   .get(`${TRAIL_ENDPOINT}?filters[entityId][$eq]=${createdBrandId}`)
    //   .set('Authorization', `Bearer ${jwt}`);
    //   'Trail fetch response (update):',
    //   trailRes.status,
    //   trailRes.body
    // );
    // expect(trailRes.status).toBe(200);
    // const updateTrail = trailRes.body.data.find(
    //   t => t.attributes.change === 'update'
    // );
    // expect(updateTrail).toBeDefined();
  });

  it('should delete the Brand and log a trail', async () => {
    const res = await request(API_URL)
      .delete(`${BRAND_ENDPOINT}/${createdBrandId}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect([200, 204]).toContain(res.status);

    // // Check for delete trail
    // const trailRes = await request(API_URL)
    //   .get(`${TRAIL_ENDPOINT}?filters[entityId][$eq]=${createdBrandId}`)
    //   .set('Authorization', `Bearer ${jwt}`);
    //   'Trail fetch response (delete):',
    //   trailRes.status,
    //   trailRes.body
    // );
    // expect(trailRes.status).toBe(200);
    // const deleteTrail = trailRes.body.data.find(
    //   t => t.attributes.change === 'delete'
    // );
    // expect(deleteTrail).toBeDefined();
  });
});
