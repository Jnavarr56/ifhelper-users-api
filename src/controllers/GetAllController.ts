import * as e from 'express';
import aqp from 'api-query-params';
import { NativeError } from 'mongoose';

import User from '../models/User';
import { IUser } from '../types/User';

import { GetAllResponse } from '../types/Response';
import BaseController from './BaseController';

export default class GetAllController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) convert query params to objects that can be passed to mongoose
		// db query methods.
		const dbQueryValues = aqp(req.query);
		const { limit, skip, sort, filter, population } = dbQueryValues;

		//2 ) pass the objects to the mongoose query.
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
