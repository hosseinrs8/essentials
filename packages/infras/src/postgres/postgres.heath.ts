import { InterfaceHealth } from '../interface.health';
import { Client as PGClient, Pool as PGPool } from 'pg';

export class PostgresHeath extends InterfaceHealth<PGPool | PGClient> {
  async check(client: PGPool | PGClient): Promise<boolean> {
    try {
      const result = await client
        .query('SELECT 1;')
        .then((r) => r.rowCount === 1);
      return result;
    } catch (e) {
      return false;
    }
  }
}
