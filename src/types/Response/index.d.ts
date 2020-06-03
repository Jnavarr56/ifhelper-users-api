import { IUser } from '../User';

export interface ErrorResponse {
	error_code: string;
	error?: unknown;
}

export interface GetAllResponse {
	query_results: IUser[];
}
