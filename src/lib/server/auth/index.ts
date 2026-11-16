import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getDb, schema } from '$lib/server/db';

export const createAuth = (d1: D1Database, appUrl?: string, secret?: string) => {
	if (!secret) {
		throw new Error('BETTER_AUTH_SECRET is required');
	}

	return betterAuth({
		baseURL: appUrl || 'http://localhost:5173',
		secret,
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			requireEmailVerification: false
		},
		database: drizzleAdapter(getDb(d1), {
			provider: 'sqlite',
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification
			}
		}),
		user: {
			additionalFields: {
				username: {
					type: 'string',
					required: false,
					input: true
				},
				roles: {
					type: 'string',
					required: false,
					defaultValue: '["main_plo"]',
					input: false
				},
				status: {
					type: 'string',
					required: false,
					defaultValue: 'active',
					input: false
				},
				phone: {
					type: 'string',
					required: false,
					input: true
				}
			}
		},
		plugins: [
			sveltekitCookies(getRequestEvent)
		]
	});
};

export type AppAuth = ReturnType<typeof createAuth>;
