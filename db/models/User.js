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
			type: String,
			required: true
		},
		email_verified: {
			type: Boolean,
			default: false
		},
		active: {
			type: Boolean,
			default: true
		},
		access_level: {
			type: String,
			enum: [ "basic", "admin" ]
		}
	},
	{ timestamps: true }
);

module.exports = model("User", UserSchema, "User");
