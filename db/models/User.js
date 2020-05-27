const bcrypt = require("bcrypt");
const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
	{
		first_name: {
			type: String,
			required: true
		},
		last_name: {
			type: String,
			required: true
		},
		email: {
			unique: true,
			type: String,
			required: true
		},
		email_confirmed: {
			type: Boolean,
			default: false
		},
		password: {
			type: String,
			required: true
		},
		active: {
			type: Boolean,
			default: true
		},
		access_level: {
			type: String,
			enum: [ "BASIC", "ADMIN", "SYS-ADMIN" ],
			default: "BASIC"
		}
	},
	{ timestamps: true }
);


// const salt = bcrypt.genSaltSync(10);
	// newUser.password = bcrypt.hashSync(newUser.password, salt);
UserSchema.pre('save', function(next) {
	const self = this;
	bcrypt.hash(this.password, 10, (error, hash) => {
		if (error) return next(error);
		self.password = hash;
		next();
	});
});


module.exports = model("User", UserSchema, "User");
