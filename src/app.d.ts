import type { AppAuth } from '$lib/server/auth';
import type { UserRole } from '$lib/server/auth/roles';

export interface SendEmail {
	send(message: {
		to: string | { email: string; name?: string } | (string | { email: string; name?: string })[];
		from: string | { email: string; name?: string };
		subject: string;
		text?: string;
		html?: string;
		replyTo?: string | { email: string; name?: string };
		cc?: string | { email: string; name?: string } | (string | { email: string; name?: string })[];
		bcc?: string | { email: string; name?: string } | (string | { email: string; name?: string })[];
		headers?: Record<string, string>;
	}): Promise<{ messageId?: string } | any>;
}

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				BUCKET?: R2Bucket;
				AI?: any;
				EMAIL?: SendEmail;
				SEND_EMAIL?: SendEmail;
				SENDER_EMAIL?: string;
				BETTER_AUTH_SECRET?: string;
			};
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			auth: AppAuth;
			user: {
				id: string;
				name: string;
				email: string;
				username?: string | null;
				roles: UserRole[];
				disabled?: boolean;
				ownershipPercentage?: number;
				voteWeightBps?: number;
				associateRelationship?: 'family' | 'co_owner' | 'delegate' | null;
				sponsoringMainPloUserId?: string | null;
				sponsorName?: string | null;
			} | null;
			session: {
				id: string;
				userId: string;
				expiresAt: Date;
			} | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
