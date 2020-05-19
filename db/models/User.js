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
		email_verified: {
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
			enum: [ "BASIC", "ADMIN" ],
			default: "BASIC"
		}
	},
	{ timestamps: true }
);

module.exports = model("User", UserSchema, "User");
