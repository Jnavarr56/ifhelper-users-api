import { Schema, model } from 'mongoose';
import { IUser } from '../types/User';

const UserSchema = new Schema(
	{
		google_id: {
			type: String,
			default: null
		},
		first_name: {
			type: String,
			required: true
		},
		last_name: {
			type: String,
			required: true
		},
		email: {
			unique: true,
			type: String,
			required: true
		},
		email_confirmed: {
			type: Boolean,
			default: false
		},
		password: {
			type: String,
			required: true
		},
		active: {
			type: Boolean,
			default: true
		},
		access_level: {
			type: String,
			enum: ['BASIC', 'ADMIN', 'SYS_ADMIN'],
			default: 'BASIC'
		}
	},
	{
		timestamps: {
			createdAt: 'created_at',
			updatedAt: 'updated_at'
		}
	}
);

// UserSchema.pre('save', function (next) {
// 	const self = this;
// 	bcrypt.hash(this.password, 10, (error, hash) => {
// 		if (error) return next(error);
// 		self.password = hash;
// 		next();
// 	});
// });

export default model<IUser>('User', UserSchema, 'User');
