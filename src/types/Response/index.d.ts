import { IUser } from '../User';

export interface ErrorResponse {
	error_code: string;
	error?: unknown;
}

export interface GetAllResponse {
	query_results: IUser[];
}

export type GetResponse = IUser;

export interface PostResponse {
	new_user: IUser;
}

export interface PatchResponse {
	updated_user: IUser;
}

export interface DeleteResponse {
	deleted_user: IUser;
}
