import { Document } from 'mongoose';

export interface IUser extends Document {
	google_id: string | null;
	first_name: string;
	last_name: string;
	email: string;
	email_confirmed: boolean;
	password: string;
	active: boolean;
	access_level: 'BASIC' | 'ADMIN' | 'SYS-ADMIN';
	created_at: Date;
	updated_at: Date;
}
