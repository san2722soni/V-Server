import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";
const { ObjectId } = mongoose.Schema.Types;

const querySchema = new mongoose.Schema(
  {
    creator: {
      developerId: {
        type: ObjectId,
        ref: "Developer",
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    type: {
      type: String,
      enum: ["mongo", "redis"],
      required: true,
    },
    queryString: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: {
        developerId: {
          type: ObjectId,
          ref: "Developer",
        },
        email: {
          type: String,
        },
      },
      default: null,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default modelWrapper(mongoose.model("Query", querySchema));
