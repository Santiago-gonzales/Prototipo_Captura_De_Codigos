import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: required("DATABASE_URL"),
  rasiDatabaseUrl: process.env.RASI_DATABASE_URL || null,
  rasiDbName: process.env.RASI_DB_NAME || null,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173"
};
