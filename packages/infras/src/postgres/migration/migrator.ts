import { readdir, readFile } from 'fs/promises';
import { join as pathJoin } from 'path';
import { Container, Logger, LogService } from '@essentials/common';
import { Client } from 'pg';
import { MIGRATION_TABLE_DOWN, MIGRATION_TABLE_UP } from './migrator.const';

enum MigrationState {
  UP,
  DOWN,
}

interface MigrationEntity {
  id: string;
  name: string;
  executedAt: string;
}

export class Migrator {
  private readonly logger: Logger;

  constructor(
    private readonly client: Client,
    protected readonly migrationPath: string,
    protected readonly _migrationTableName = 'migration',
    logger?: Logger,
  ) {
    if (!logger) {
      this.logger = Container.get(LogService).createServiceLogger(
        Migrator.name,
      );
    } else {
      this.logger = logger;
    }
  }

  private async isMigrationTableExist() {
    const { exists } = await this.client
      .query<{
        exists: boolean;
      }>(
        'SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname=$1 AND tablename=$2 );',
        ['public', this._migrationTableName],
      )
      .then((r) => r.rows[0]);
    return exists;
  }

  private async createIfNotExistMigrationTable() {
    const exists = await this.isMigrationTableExist();
    if (!exists) {
      await this.runQuery(
        MIGRATION_TABLE_UP(this._migrationTableName),
        this._migrationTableName,
      );
    }
  }

  private async runQuery(
    queries: string,
    name: string,
    withLog = false,
    mode?: MigrationState,
  ) {
    await this.client.query('BEGIN');
    await this.client.query(queries);
    if (withLog) {
      if (mode === MigrationState.UP) {
        await this.client.query(
          `INSERT INTO "${this._migrationTableName}" ("name", "executedAt")
                     VALUES ($1, NOW())`,
          [name],
        );
      } else {
        await this.client.query(
          `DELETE
                     FROM "${this._migrationTableName}"
                     WHERE name = $1`,
          [name],
        );
      }
    }
    await this.client.query('COMMIT');
  }

  async run(name: string, mode: MigrationState, withLog = true) {
    const queries = await readFile(
      pathJoin(
        this.migrationPath,
        name,
        mode === MigrationState.UP ? 'up.sql' : 'down.sql',
      ),
      'utf8',
    );
    try {
      await this.runQuery(queries, name, withLog, mode);
      this.logger.info(
        `"${name}":${MigrationState[mode]} migration executed successfully.`,
      );
    } catch (e) {
      await this.client.query('ROLLBACK');
      this.logger.error(
        `"${name}":${MigrationState[mode]} migration has error.`,
        { errorMessage: (e as Error).message, error: (e as Error).toString() },
      );
      throw e;
    }
  }

  private async getAvailableMigrations() {
    if (!(await this.isMigrationTableExist())) return [];
    return readdir(this.migrationPath);
  }

  private async getExecutedMigrations() {
    return this.client
      .query<MigrationEntity>(
        `SELECT *
                 FROM ${this._migrationTableName}`,
      )
      .then((r) => r.rows);
  }

  async up() {
    this.logger.info('start UP migrations');
    await this.createIfNotExistMigrationTable();
    const availableMigrations = await this.getAvailableMigrations();
    const executedMigrationNames = await this.getExecutedMigrations().then(
      (r) => r.map((e) => e.name),
    );
    const targetMigrations = availableMigrations
      .filter((r) => !executedMigrationNames.includes(r))
      .sort((a, b) => (a > b ? 1 : -1));
    for (const targetName of targetMigrations) {
      await this.run(targetName, MigrationState.UP);
    }
    this.logger.info('migrations finished');
  }

  async down(full = false) {
    this.logger.info('start DOWN migrations');
    const executedMigrationNames = await this.getExecutedMigrations().then(
      (r) => r.map((e) => e.name).sort((a, b) => (a < b ? 1 : -1)),
    );
    for (const targetName of executedMigrationNames) {
      await this.run(targetName, MigrationState.DOWN);
    }
    if (full) {
      await this.runQuery(
        MIGRATION_TABLE_DOWN(this._migrationTableName),
        this._migrationTableName,
      );
    }
  }

  destroy() {
    return this.client.end();
  }
}
