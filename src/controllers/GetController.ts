import * as e from 'express';
import User from '../models/User';

import { IUser } from '../types/User';
import { SystemTokenPayload, TokenPayload } from '../types/Auth';
// import { GetAllResponse } from '../types/Response';

import BaseController from './BaseController';

export default class GetController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) extract URL paramater.
		const userIDParam: string = req.params.userID;

		// 2) extract the authentication processing result from our auth middleware.
		const authenticationResults: undefined | TokenPayload | SystemTokenPayload =
			req.payload;

		// 3) if authentication result not present then reject.
		if (!authenticationResults) {
			const error: Error = new Error('System Requested GET to /users/me');
			return this.fail(res, error);
		}

		// 3) this string will be used as the id value to query our db.
		let queryID: string;

		if (userIDParam === 'me') {
			// 4) allow a url param of 'me' to set the db query to look for the
			// user who was issued the supplied token.

			// the system isn't an actual user.
			if (authenticationResults.access_type === 'SYSTEM') {
				const error: Error = new Error('System Requested GET to /users/me');
				return this.fail(res, error);
			}

			const authenticatedUserID: string =
				authenticationResults.authenticated_user._id;
			queryID = authenticatedUserID;
		} else {
			// 4) if the requester is an actual user and they are requesting a user record that does not
			// match their own id, reject.

			if (
				authenticationResults.access_type === 'USER' &&
				authenticationResults.authenticated_user._id !== userIDParam
			) {
				return this.unauthorized(res);
			}

			queryID = userIDParam;
		}

		User.findById(queryID, (error: any, user: IUser | null) => {
			if (error) return this.fail(res, error);
			if (!user) return this.notFound(res);

			const response: IUser = user;
			this.ok(res, response);
		});
	}
}
