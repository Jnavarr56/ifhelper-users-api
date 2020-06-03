import * as e from 'express';
import aqp from 'api-query-params';
import { NativeError } from 'mongoose';

import User from '../models/User';
import { IUser, AccessLevel } from '../types/User';

import { TokenPayload, SystemTokenPayload } from '../types/Auth';
import { GetAllResponse } from '../types/Response';
import BaseController from './BaseController';

const PERMITTED_ACCESS_LEVELS: AccessLevel[] = ['ADMIN', 'SYS_ADMIN'];

export default class GetAllController extends BaseController {
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

		// 2) convert query params to objects that can be passed to mongoose
		// db query methods.
		const dbQueryValues = aqp(req.query);
		const { limit, skip, sort, filter, population } = dbQueryValues;

		// 3) pass the objects to the mongoose query.
		User.find(filter)
			.limit(limit)
			.skip(skip)
			.sort(sort)
			.populate(population)
			.exec((error: NativeError | null, users: IUser[]) => {
				// 3) if error, respond with 500.
				if (error) return this.fail(res, error);

				// 5) if no error, format and respond.
				const response: GetAllResponse = {
					query_results: users
				};

				this.ok(res, response);
			});
	}
}
