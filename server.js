const redis = require("redis");
const axios = require("axios");
const bcrypt = require("bcrypt");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const aqp = require("api-query-params");
const bodyParser = require("body-parser");
const bearerToken = require("express-bearer-token");

const { User } = require("./db/models");

const PORT = process.env.PORT || 3000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const MONGO_DB_URL = "mongodb://127.0.0.1:27017";

const AUTH_API = "http://localhost:5000/authorize";
const REFRESH_AUTH_API = "http://localhost:5000/refresh";

const PATHNAME = "/users";

const cache = redis.createClient(REDIS_PORT);
const app = express();

const deleteFromCache = key => cache.del(key);

const userAuthTokenCache = redis.createClient({
	port: REDIS_PORT,
	prefix: "USER_AUTHENTICATION"
});

const checkUserAuthTokenCache = accessToken => {
	return new Promise(resolve => {
		userAuthTokenCache.get(accessToken, (cacheError, cachedVal) => {
			resolve({ cacheError, cachedVal: JSON.parse(cachedVal) });
		});
	});
};

const authMiddleware = accessLevels => {
	return (req, res, next) => {
		const { token } = req;

		if (!token) {
			return res.status(401).send({
				error_code: "MISSING AUTHORIZATION BEARER TOKEN"
			});
		}

		const headers = { Authorization: `Bearer ${token}` };

		axios
			.get(AUTH_API, { headers })
			.then(({ data }) => {
				let permit = true;
				const { access_type } = data;

				if (
					access_type !== "SYSTEM" &&
					accessLevels &&
					!accessLevels.includes(data.authenticated_user.access_level)
				) {
					permit = false;
				}

				if (!permit) {
					return res.status(401).send({
						error_code: "INSUFFICIENT ACCESS LEVEL"
					});
				}

				req.locals = { ...data };
				next();
			})
			.catch(error => {
				const {
					data: { error_code },
					status
				} = error.response;
				return res.status(status).send({ error_code });
			});
	};
};

app
	.use(bodyParser.urlencoded({ extended: true }))
	.use(bodyParser.json())
	.use(bearerToken())
	.use(morgan("dev"));

app.get(PATHNAME, authMiddleware([ "ADMIN" ]), (req, res) => {
	const dbQueryValues = aqp(req.query);
	const { limit, skip, sort, filter, population } = dbQueryValues;

	User.find(filter)
		.limit(limit)
		.skip(skip)
		.sort(sort)
		.populate(population)
		.exec((error, query_results) => {
			if (error) return res.status(500).send({ error });
			res.send({ query_results });
		});
});

// Make more me's.
// app.get(`${PATHNAME}/me`, authMiddleware(['BASIC', 'ADMIN']), (req, res) => {

// 	const { authenticated_user: { _id } } = req.locals;

// 	User.findById(_id, (error, user) => {
// 		if (error) return res.status(500).send(error);

// 		if (!user) {
// 			return res.sendStatus(404);
// 		}

// 		res.send({ user });
// 	});
// });

app.get(`${PATHNAME}/:user_id`, authMiddleware([ "ADMIN" ]), (req, res) => {
	const { user_id } = req.params;

	User.findById(user_id, (error, user) => {
		if (error) return res.status(500).send(error);

		if (!user) {
			return res.sendStatus(404);
		}

		res.send({ user });
	});
});

app.post(PATHNAME, authMiddleware([ "ADMIN" ]), async (req, res) => {
	const { body: newUserData } = req;

	const newUser = new User(newUserData);

	try {
		await newUser.save();
	} catch (error) {
		console.trace("PROBLEM CREATING USER");
		console.trace(error);

		const { name } = error;

		if (name === "MongoError" && error.keyPattern.email) {
			return res
				.status(400)
				.send({ error_code: "USER WITH EMAIL ALREADY EXISTS" });
		} else if (name === "ValidationError") {
			const { errors } = error;
			const bad_params = {};

			for (let param in errors) {
				bad_params[param] = errors[param].kind;
			}
			return res.status(400).send({
				error_code: "BAD PARAMS",
				bad_params
			});
		}

		return res.status(500).send(error);
	}

	const salt = bcrypt.genSaltSync(10);
	newUser.password = bcrypt.hashSync(newUser.password, salt);

	try {
		await newUser.save();
	} catch (error) {
		return res.status(500).send(error);
	}

	res.send({ new_user: newUser });
});

app.patch(`${PATHNAME}/:user_id`, authMiddleware([ "ADMIN" ]), (req, res) => {
	const { user_id } = req.params;
	const { body: updatedUserData } = req;

	User.findByIdAndUpdate(
		user_id,
		updatedUserData,
		{ new: true, runValidators: true },
		(error, updated_user) => {
			if (error) return res.status(500).send({ error });

			if (!updated_user)
				return res.status(500).send({ error: "Problem Retrieving Updated User" });

			res.send({ updated_user });
		}
	);
});

app.delete(`${PATHNAME}/:user_id`, authMiddleware([ "ADMIN" ]), (req, res) => {
	const { user_id } = req.params;

	User.findByIdAndDelete(user_id, (error, deleted_user) => {
		if (error) {
			return res.status(500).send({ error });
		} else if (!deleted_user) {
			return res.status(500).send({ error: "PROBLEM RETRIEVING DELETED USER" });
		}

		deleteFromCache("EMAIL_AVAILABILITY" + deleted_user.email);
		res.send({ deleted_user });
	});
});

const dbOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true
};

cache.on("connect", error => {
	if (error) {
		console.log(error);
		process.exit(1);
	}

	mongoose.connect(`${MONGO_DB_URL}/users-api`, dbOptions, error => {
		if (error) {
			console.log(error);
			process.exit(1);
		}

		app.listen(PORT, () => {
			console.log(`Users API running on PORT ${PORT}!`);
		});
	});
});
