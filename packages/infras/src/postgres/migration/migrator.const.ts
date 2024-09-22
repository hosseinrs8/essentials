export const MIGRATION_TABLE_UP = (migrationTableName: string) => `
    CREATE TABLE IF NOT EXISTS "${migrationTableName}"
    (
        "id"         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"       VARCHAR(32) NOT NULL,
        "executedAt" TIMESTAMP   NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS migration_name_unique ON "${migrationTableName}" ("name");
`;
export const MIGRATION_TABLE_DOWN = (migrationTableName: string) => `
    DROP TABLE IF EXISTS "${migrationTableName}";
`;
