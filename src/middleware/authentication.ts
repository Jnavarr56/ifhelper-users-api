import * as e from 'express';
import httpStatusCodes from 'http-status-codes';
import axios from 'axios';
import { AUTH_API } from '../vars';
import { AuthorizedConfig } from '../types';
import {
	AuthResponse,
	AuthError,
	TokenPayload,
	SystemTokenPayload
} from '../types/Auth';
import { ErrorResponse } from '../types/Response';

export default function authentication(
	req: e.Request,
	res: e.Response,
	next: e.NextFunction
): void {
	const token: string | undefined = req.token;

	if (!token) {
		const error: ErrorResponse = {
			error_code: 'Missing Authorization Bearer Token'
		};
		res.status(401).json(error);
		return;
	}

	const URL = `${AUTH_API}/authorize`;
	const config: AuthorizedConfig = {
		headers: { Authorization: `Bearer ${token}` }
	};

	axios
		.get(URL, config)
		.then((response: AuthResponse) => {
			// extract authentication processing results and attach them to
			// the req object for handling in the controller.
			const tokenPayload: TokenPayload | SystemTokenPayload = response.data;
			req.credentials = tokenPayload;
			next();
		})
		.catch((errorResponse: AuthError) => {
			// if error wasn't returned from the auth api then
			// respond with a 500.
			if (!errorResponse.response) {
				res.send(500).json(httpStatusCodes.getStatusText(500));
				return;
			}

			// if error was returned from the auth api then
			// forward the response to the client.
			const statusCode: number = errorResponse.response.status;
			const error: ErrorResponse = errorResponse.response.data;

			res.status(statusCode).json(error);
			return;
		});
}
