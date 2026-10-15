import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Donation from './Donation.js';

// Isolation: an in-memory MongoDB keeps tests off the real Atlas cluster, so
// no .env credentials are read and no production data can be touched.
let mongod;

const validDonation = () => ({
  itemType: 'chicken bento',
  quantity: 20,
  unit: 'packets',
  location: '212 ANG MO KIO AVENUE 3 SINGAPORE 560212',
  postalCode: '560212',
  expiresAt: new Date(Date.now() + 2 * 3600 * 1000),
  expiryHours: 2,
  priority: 'high',
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await Donation.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Donation model', () => {
  it('saves a valid donation with the expected field values', async () => {
    const input = validDonation();
    const saved = await Donation.create(input);

    const found = await Donation.findById(saved._id).lean();

    expect(found).not.toBeNull();
    expect(found.itemType).toBe('chicken bento');
    expect(found.quantity).toBe(20);
    expect(found.unit).toBe('packets');
    expect(found.location).toBe(input.location);
    expect(found.postalCode).toBe('560212');
    expect(found.expiryHours).toBe(2);
    expect(found.priority).toBe('high');
    expect(found.expiryAssumed).toBe(false);
    expect(found.createdAt).toBeInstanceOf(Date);
  });

  it('defaults priority to medium when not provided', async () => {
    const input = validDonation();
    delete input.priority;
    const saved = await Donation.create(input);

    expect(saved.priority).toBe('medium');
  });

  it('rejects a donation without the required itemType', async () => {
    const input = validDonation();
    delete input.itemType;

    await expect(Donation.create(input)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
    await expect(Donation.create(input)).rejects.toMatchObject({
      errors: { itemType: expect.anything() },
    });
    expect(await Donation.countDocuments()).toBe(0);
  });

  it('rejects a non-integer quantity', async () => {
    const input = { ...validDonation(), quantity: 2.5 };

    await expect(Donation.create(input)).rejects.toMatchObject({
      errors: { quantity: expect.anything() },
    });
  });

  it('rejects a priority outside the allowed values', async () => {
    const input = { ...validDonation(), priority: 'urgent' };

    await expect(Donation.create(input)).rejects.toMatchObject({
      errors: { priority: expect.anything() },
    });
  });
});
