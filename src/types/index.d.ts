import { AxiosRequestConfig } from 'axios';
import * as a from './Auth';

export interface AuthorizedConfig extends AxiosRequestConfig {
	headers: {
		Authorization: string;
	};
}

declare global {
	namespace Express {
		interface Request {
			credentials: undefined | a.TokenPayload | a.SystemTokenPayload;
		}
	}
}
