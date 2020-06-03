import { AxiosResponse, AxiosError } from 'axios';
import { ErrorResponse } from '../Response';
import { AccessLevel } from '../User';

export interface TokenPayload {
	access_type: 'USER';
	authenticated_user: {
		access_level: AccessLevel;
		_id: string;
	};
}

export interface SystemTokenPayload {
	access_type: 'SYSTEM';
	authenticated_user?: {
		_id: string;
	};
}

export interface AuthResponse extends AxiosResponse {
	data: TokenPayload | SystemTokenPayload;
}

export interface AuthError extends AxiosError {
	response?: AxiosResponse<ErrorResponse>;
}
