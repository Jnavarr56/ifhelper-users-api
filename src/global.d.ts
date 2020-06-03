import { TokenPayload, SystemTokenPayload } from './types/Auth';

declare module 'express' {
	export interface Request {
		payload: undefined | TokenPayload | SystemTokenPayload;
	}
}
