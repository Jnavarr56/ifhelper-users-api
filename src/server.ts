import app from './app';
import mongoose, { ConnectionOptions } from 'mongoose';
import { PORT } from './vars';
import * as dotenv from 'dotenv';

dotenv.config();

const dbOptions: ConnectionOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true
};

mongoose.connect(
	`${process.env.MONGO_DB_URL}/users-api?retryWrites=true&w=majority`,
	dbOptions,
	(error) => {
		if (error) {
			console.log(error);
			process.exit(1);
		}
		app.listen(PORT, () => {
			console.log(`Users API running on PORT ${PORT}! of http://users-api`);
		});
	}
);
