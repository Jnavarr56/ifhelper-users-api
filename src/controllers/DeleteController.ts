import * as e from 'express';

import User from '../models/User';
import { IUser, AccessLevel } from '../types/User';

import { TokenPayload, SystemTokenPayload } from '../types/Auth';
import { DeleteResponse } from '../types/Response';
import BaseController from './BaseController';

const PERMITTED_ACCESS_LEVELS: AccessLevel[] = ['ADMIN', 'SYS_ADMIN'];

export default class DeleteController extends BaseController {
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

		const requestedUserID: string = req.params.userID;

		const existingUser: IUser | null = await User.findById(requestedUserID);
		if (!existingUser) {
			return this.conflict(res);
		}

		await User.findByIdAndDelete(
			requestedUserID,
			(error: Error, deletedUser: IUser | null) => {
				if (error || !deletedUser) {
					return this.fail(res, error || 'Could Not Retrieve Deleted User');
				}

				const response: DeleteResponse = {
					deleted_user: deletedUser
				};

				this.ok(res, response);
			}
		);
	}
}
