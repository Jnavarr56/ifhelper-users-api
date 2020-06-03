import * as e from 'express';
import bcrypt from 'bcrypt';

import User from '../models/User';
import { IUser, AccessLevel, CreateIUserInput } from '../types/User';

import { TokenPayload, SystemTokenPayload } from '../types/Auth';
import { PostResponse } from '../types/Response';
import BaseController from './BaseController';

const PERMITTED_ACCESS_LEVELS: AccessLevel[] = ['ADMIN', 'SYS_ADMIN'];

export default class PostController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) extract the credentials processing result from our auth middleware.
		const requestCredentials: undefined | TokenPayload | SystemTokenPayload =
			req.credentials;

		if (!requestCredentials) {
			// 2) if authentication processing result not present then reject.
			return this.credentialProcessingError(res);
		} else if (requestCredentials.access_type === 'USER') {
			// 2) if present but user does not have a permitted access level, then reject.
			const requesterAccessLevel: AccessLevel =
				requestCredentials.authenticated_user.access_level;

			if (!PERMITTED_ACCESS_LEVELS.includes(requesterAccessLevel)) {
				return this.forbidden(res);
			}
		}

		// 3) define the new user input values.
		const newUserInput: CreateIUserInput = req.body;

		// 4) check to all required string values are present.
		const requiredStringFields = ['first_name', 'last_name', 'email', 'password'];
		const invalidFields: { [key: string]: string } = requiredStringFields.reduce(
			(fields: { [key: string]: string }, requiredStrField: string) => {
				if (typeof newUserInput[requiredStrField] !== 'string') {
					fields[requiredStrField] === 'must be string';
				} else if (fields[requiredStrField].length === 0) {
					fields[requiredStrField] === 'required';
				}

				return fields;
			},
			{}
		);

		// 5) if any params are missing then send back error containing description.
		if (Object.keys(invalidFields).length > 0) {
			return this.invalidParams(res, invalidFields);
		}

		// 6) make sure no user with the supplied email exists, reject if so.
		const existingUser: IUser | null = await User.findOne({
			email: newUserInput.email
		});
		if (existingUser)
			return this.badRequest(res, 'User with email already exists');

		// 7) Hash the user password and create the user.
		const hashedPassword: string = await bcrypt.hash(newUserInput.password, 10);
		const newUser: IUser = await User.create({
			...newUserInput,
			password: hashedPassword
		});

		/// 8) format and send.
		const response: PostResponse = {
			new_user: newUser
		};

		this.created(res, response);
	}
}
