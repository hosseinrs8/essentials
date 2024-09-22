import { Container, LogService, Service } from '@essentials/common';
import { PostgresFactory } from '../postgres.factory';
import { Migrator } from './migrator';

@Service()
export class MigrationFactory {
  constructor(
    protected readonly postgresFactory: PostgresFactory,
    protected readonly logService: LogService,
  ) {}

  async create(
    identityName: string,
    migrationPath = 'migrations',
    migrationTableName = 'migrations',
  ) {
    const client = await this.postgresFactory.createConnection(identityName);
    return new Migrator(
      client,
      migrationPath,
      migrationTableName,
      this.logService.createServiceLogger(`db.migrator.${identityName}`),
    );
  }

  static create(
    identityName: string,
    migrationPath = 'migrations',
    migrationTableName = 'migrations',
  ) {
    return Container.get(MigrationFactory).create(
      identityName,
      migrationPath,
      migrationTableName,
    );
  }
}
