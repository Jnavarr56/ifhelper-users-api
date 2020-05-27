const axios = require("axios");
const bcrypt = require("bcrypt");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const aqp = require("api-query-params");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bearerToken = require("express-bearer-token");

const { User } = require("./db/models");

const {
	ENV_PORT,
	MONGO_DB_URL,
	AUTHORIZE_API = 'http://server/api/authentication/authorize'
} = process.env;
const PORT = ENV_PORT || 3000;

const API_BASE_URL = typeof process.env.API_BASE_URL === "string" ? process.env.API_BASE_URL : "/api";
const PATHNAME = "/users";
const API_NAME = API_BASE_URL + PATHNAME;

const app = express();

app
	.use(bodyParser.urlencoded({ extended: true }))
	.use(bodyParser.json())
	.use(bearerToken())
	.use(cookieParser())
	.use(morgan("dev"));


const authMiddleware = (accessLevels) => {
	return async (req, res, next) => {
		const { token } = req;

		if (!token) {
			return res.status(401).send({
				error_code: "MISSING AUTHORIZATION BEARER TOKEN"
			});
		}

		const headers = { Authorization: `Bearer ${token}` };
		axios
			.get(AUTHORIZE_API, { headers })
			.then(({ data: tokenPayload })=> {

				const { access_type, authenticated_user } = tokenPayload;
				

				let permit = true;
				if (access_type === "USER") {
					if (accessLevels && 
						!accessLevels.includes(authenticated_user.access_level)
					) {
						permit === false;
					}
					
				} 

				if (!permit) {
					return res.status(403).send({
						error_code: "INSUFFICIENT ACCESS LEVEL"
					});
				}

				req.locals = tokenPayload;
				next();
			})
			.catch(error => {
				const { status, data } = error.response;

				if (status === 401) {
					return res.status(status).send(data);	
				} else {
					throw new Error(error);
				}
			});
	};
};

const limitToSelf = (access_type, access_level, match) => {
	return access_type === "USER" &&
	access_level === "BASIC" && match
}
	
app.get(API_NAME, authMiddleware([ "ADMIN" ]), (req, res) => {
	const dbQueryValues = aqp(req.query);
	const { limit, skip, sort, filter, population } = dbQueryValues;

	User.find(filter)
		.limit(limit)
		.skip(skip)
		.sort(sort)
		.populate(population)
		.exec((error, query_results) => {
			if (error) return res.status(500).send(error);
			res.send({ query_results });
		});
});

app.get(
	`${API_NAME}/:user_id`,
	authMiddleware([ "BASIC", "ADMIN" ]),
	(req, res) => {
		const { user_id } = req.params;
		const { access_type, authenticated_user } = req.locals;

		const forbid = limitToSelf(
			access_type, 
			authenticated_user.access_level, 
			authenticated_user._id !== user_id
		);
		
		if (forbid) {
			return res
				.status(403)
				.send({ error_code: "BASIC USER MAY ONLY RETRIEVE SELF" });
		}

		User.findById(user_id, (error, user) => {
			if (error) return res.status(500).send(error);
			if (!user) return res.sendStatus(404);
			res.send(user);
		});
	}
);


const isUniqueError = (error) => {
	return error.name === "MongoError" && error.keyPattern.email;
}

const isBadParamsError = (error) => {
	return error.name === "ValidationError";
}

app.post(API_NAME, authMiddleware([ "ADMIN" ]), async (req, res) => {
	const { body: newUserData } = req;

	const new_user = new User(newUserData);

	try { 
		await new_user.save(); 

	} catch (error) {

		if (isUniqueError(error)) {

			return res.status(400).send({ error_code: "USER WITH EMAIL ALREADY EXISTS" });

		} else if (isBadParamsError(error)) {

			return res.status(400).send({
				error_code: "BAD PARAMS",
				bad_params: Object.keys(error.errors).map(param => {
					const val = {};
					val[param] = error.errors[param].kind;
					return val;
				})
			});

		}

		res.status(500).send(error);
	}

	res.send({ new_user });
});

app.patch(`${API_NAME}/:user_id`, authMiddleware([ "BASIC", "ADMIN" ]), (req, res) => {
	const { user_id } = req.params;
	const { body: updatedUserData } = req;
	const { authenticated_user, access_type } = req.locals;

	const forbid = limitToSelf(
		access_type, 
		authenticated_user.access_level, 
		authenticated_user._id !== user_id
	);
	if (forbid) {
		return res.status(403).send({ error_code: "BASIC USER MAY ONLY RETRIEVE SELF" });
	}

	if (updatedUserData.password) {
		bcrypt.hash(updatedUserData.password, 10, (hashError, password) => {
			if (hashError) return res.status(500).send(hashError);
			User.findByIdAndUpdate(
				user_id,
				{ ...updatedUserData, password },
				{ new: true, runValidators: true, useFindAndModify: true },
				(error, updated_user) => {
					if (error) return res.status(500).send(error);
					if (!updated_user) return res.sendStatus(404).send();
					res.send({ updated_user });
				}
			);
		});
	} else {
		User.findByIdAndUpdate(
			user_id,
			{ ...updatedUserData, password },
			{ new: true, runValidators: true, useFindAndModify: true },
			(error, updated_user) => {
				if (error) return res.status(500).send(error);
				if (!updated_user) return res.sendStatus(404).send();
				res.send({ updated_user });
			}
		);
	}
});


app.delete(`${API_NAME}/:user_id`, authMiddleware([ "ADMIN" ]), (req, res) => {
	User.findByIdAndDelete(req.params.user_id, (error, deleted_user) => {
		if (error) return res.status(500).send(error);
		if (!deleted_user) return res.sendStatus(404).send();
		res.send({ deleted_user });
	});
});

const dbOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true
};

mongoose.connect(`${MONGO_DB_URL}/users-api?retryWrites=true&w=majority`, dbOptions, error => {
	if (error) {
		console.log(error);
		process.exit(1);
	}
	User.init().then(() => {
		app.listen(PORT, () => {
			console.log(`Users API running on PORT ${PORT}!`);
		});
	})
});
