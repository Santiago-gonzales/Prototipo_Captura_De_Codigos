import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({ connectionString: env.databaseUrl });

function createRasiPool(): Pool | null {
	if (env.rasiDatabaseUrl) {
		return new Pool({
			connectionString: env.rasiDatabaseUrl,
			options: "-c default_transaction_read_only=on"
		});
	}

	if (!env.rasiDbName) {
		return null;
	}

	const databaseUrl = new URL(env.databaseUrl);
	databaseUrl.pathname = `/${env.rasiDbName}`;
	return new Pool({
		connectionString: databaseUrl.toString(),
		options: "-c default_transaction_read_only=on"
	});
}

export const rasiPool = createRasiPool();
