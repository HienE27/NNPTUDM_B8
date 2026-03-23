const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            default: ""
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Collection MongoDB: "roles" (Mongoose tự pluralize từ "role")
module.exports = mongoose.model("role", roleSchema, "roles");