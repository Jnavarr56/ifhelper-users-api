import * as e from 'express';
import bcrypt from 'bcrypt';

import User from '../models/User';
import { IUser, AccessLevel, UpdateIUserInput } from '../types/User';

import { TokenPayload, SystemTokenPayload } from '../types/Auth';
import { PatchResponse } from '../types/Response';
import BaseController from './BaseController';

interface validationPair {
	field: string;
	type: string | AccessLevel[];
}

export default class PatchController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) extract the credentials processing result from our auth middleware.
		const requestCredentials: undefined | TokenPayload | SystemTokenPayload =
			req.credentials;

		// 2) if authentication processing result not present then reject.
		if (!requestCredentials) {
			return this.credentialProcessingError(res);
		}

		// 3) extract URL paramater and define a variable to use as the
		// user id value supplied in our user database query.
		const requestedUserID: string = req.params.userID;
		let queryID: string;

		if (requestedUserID === 'me') {
			// 4) allow the url param value of 'me' to set the queryID the id
			// of the currently authenticated user who issues this request.

			if (requestCredentials.access_type === 'SYSTEM') {
				// the system is not a user.
				const error: Error = new Error('System Requested PATCH to /users/me');
				return this.fail(res, error);
			}

			queryID = requestCredentials.authenticated_user._id;
		} else {
			// 4) if the requester is an actual user and they are
			// requesting a user record that does not match their own id, reject.

			if (requestCredentials.access_type === 'USER') {
				const outOfAuthScope: boolean =
					requestCredentials.authenticated_user.access_level === 'BASIC' &&
					requestCredentials.authenticated_user._id !== requestedUserID;

				if (outOfAuthScope) {
					return this.forbidden(res);
				}
			}

			queryID = requestedUserID;
		}

		// 5) define the user update values. Make sure to check
		// something is actually supplied. If not, reject.
		const userUpdateInput: UpdateIUserInput = req.body;
		if (Object.keys(userUpdateInput).length === 0) {
			return this.badRequest(res, 'Must Supply at Least One Valid User Field');
		}

		// 6) Make sure requested user exists. If doesn'tm reject.
		const requestedUser: IUser | null = await User.findById(queryID);
		if (!requestedUser) return this.conflict(res);

		// 7) Ascertain if update is going to change email or password.
		// Do not allow users to update registration credentials here directly.
		// They must go through the registration api.
		if (
			(userUpdateInput.email || userUpdateInput.password) &&
			requestCredentials.access_type === 'USER'
		) {
			return this.forbidden(res);
		}

		// 8) parse the input for missing or invalid values and create an object
		// describing the improper values if there are any.
		const possibleFields: validationPair[] = [
			{ field: 'google_id', type: 'string' },
			{ field: 'first_name', type: 'string' },
			{ field: 'last_name', type: 'string' },
			{ field: 'email', type: 'string' },
			{ field: 'password', type: 'string' },
			{ field: 'email_confirmed', type: 'boolean' },
			{ field: 'active', type: 'boolean' },
			{ field: 'access_level', type: ['BASIC', 'ADMIN', 'SYS_ADMIN'] }
		];
		const invalidFields: { [key: string]: string } = possibleFields.reduce(
			(
				prev: { [key: string]: string },
				current: validationPair
			): { [key: string]: string } => {
				if (userUpdateInput[current.field] !== undefined) {
					console.log(userUpdateInput[current.field]);
					if (
						Array.isArray(current.type) &&
						!current.type.includes(userUpdateInput[current.field])
					) {
						prev[current.field] = `must be ${current.type.join(', ')}`;
					} else if (
						typeof userUpdateInput[current.field] !== current.type ||
						userUpdateInput[current.field].length === 0
					) {
						prev[current.field] = `must be ${current.type}`;
					}
				}

				return prev;
			},
			{}
		);

		// 9) If any params are invalid then send back error containing description.
		if (Object.keys(invalidFields).length > 0) {
			return this.invalidParams(res, invalidFields);
		}

		// 10) Apply the updates to the user record in the db.
		if (userUpdateInput.password) {
			userUpdateInput.password = await bcrypt.hash(userUpdateInput.password, 10);
		}
		Object.keys(userUpdateInput).forEach((field) => {
			requestedUser[field] = userUpdateInput[field];
		});

		await requestedUser.save();

		/// 11) format and send.
		const response: PatchResponse = {
			updated_user: requestedUser
		};

		this.ok(res, response);
	}
}
