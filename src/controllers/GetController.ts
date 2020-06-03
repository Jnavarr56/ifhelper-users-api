import * as e from 'express';
import User from '../models/User';

import { IUser } from '../types/User';
import { SystemTokenPayload, TokenPayload } from '../types/Auth';
import { GetResponse } from '../types/Response';

import BaseController from './BaseController';

export default class GetController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) extract the authentication processing result from our auth middleware.
		const requestCredentials: undefined | TokenPayload | SystemTokenPayload =
			req.credentials;

		// 2) if authentication result not present then reject.
		if (!requestCredentials) return this.credentialProcessingError(res);

		// 3) extract URL paramater and define a variable to use as the
		// user id value supplied in our user database query.
		const requestedUserID: string = req.params.userID;
		let queryID: string;

		if (requestedUserID === 'me') {
			// 4) allow the url param value of 'me' to set the queryID the id
			// of the currently authenticated user who issues this request.

			if (requestCredentials.access_type === 'SYSTEM') {
				// the system is not a user.
				const error: Error = new Error('System Requested GET to /users/me');
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

		User.findById(queryID, (error: Error, user: IUser | null) => {
			if (error) return this.fail(res, error);
			if (!user) return this.notFound(res);

			const response: GetResponse = user;

			this.ok(res, response);
		});
	}
}
