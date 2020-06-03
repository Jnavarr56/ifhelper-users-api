import { Document } from 'mongoose';

export type AccessLevel = 'BASIC' | 'ADMIN' | 'SYS_ADMIN';

export interface IUser extends Document {
	google_id: string | null;
	first_name: string;
	last_name: string;
	email: string;
	email_confirmed: boolean;
	password: string;
	active: boolean;
	access_level: AccessLevel;
	created_at: Date;
	updated_at: Date;
}

export interface CreateIUserInput {
	google_id?: IUser['google_id'];
	first_name: IUser['first_name'];
	last_name: IUser['last_name'];
	email: IUser['email'];
	email_confirmed?: IUser['email_confirmed'];
	password: IUser['password'];
	access_level?: IUser['access_level'];
}

export interface UpdateIUserInput {
	google_id?: IUser['google_id'];
	first_name?: IUser['first_name'];
	last_name?: IUser['last_name'];
	email?: IUser['email'];
	email_confirmed?: IUser['email_confirmed'];
	password?: IUser['password'];
	active?: IUser['active'];
	access_level?: IUser['access_level'];
}
