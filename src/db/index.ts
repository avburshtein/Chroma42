import { drizzle } from 'drizzle-orm/d1';
import { relations } from './schema/relations';

export function getDb(d1: D1Database) {
  return drizzle(d1, { relations });
}