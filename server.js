const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const aqp = require("api-query-params");
const bodyParser = require("body-parser");

const { User } = require("./db/models");

const PORT = 3000;
const MONGO_DB_URL = "mongodb://127.0.0.1:27017/?gssapiServiceName=mongodb";
const PATHNAME = "/users";

const app = express();

app
	.use(bodyParser.urlencoded({ extended: true }))
	.use(bodyParser.json())
	.use(morgan("dev"));



app.get(PATHNAME, (req, res) => {

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

app.get(`${PATHNAME}/:user_id`, (req, res) => {
	User.findById(req.params.user_id, (error, user) => {
		if (error) return res.status(500).send({ error });
		res.send({ user });
	});
});

app.post(PATHNAME, (req, res) => {
	const { code, ...newUserData } = req.body;

	User.create({ ...newUserData }, (error, new_user) => {
		if (error) return res.status(500).send({ error });

		if (!new_user)
			return res
				.status(500)
				.send({ error: "Problem Retrieving Newly Created User" });

		res.send({ new_user });
	});
});

app.patch(`${PATHNAME}/:user_id`, (req, res) => {
	const { code, ...updatedUserData } = req.body;
	User.findByIdAndUpdate(
		req.params.user_id,
		{ ...updatedUserData },
		{ new: true, runValidators: true },
		(error, updated_user) => {
			if (error) return res.status(500).send({ error });

			if (!updated_user)
				return res.status(500).send({ error: "Problem Retrieving Updated User" });

			res.send({ updated_user });
		}
	);
});

app.delete(`${PATHNAME}/:user_id`, (req, res) => {
	User.findByIdAndDelete(req.params.user_id, (error, deleted_user) => {
		if (error) return res.status(500).send({ error });

		if (!deleted_user)
			return res.status(500).send({ error: "Problem Retrieving Deleted User" });

		res.send({ deleted_user });
	});
});

const dbOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true
};

mongoose.connect(`${MONGO_DB_URL}/users-api`, dbOptions, error => {

    if (error) {
        console.log(error);
        process.exit(1);
    }

	app.listen(PORT, () => {
		console.log(`Users API running on PORT ${PORT}!`);
	});
});
