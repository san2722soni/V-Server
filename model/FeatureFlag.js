import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";
import { FeatureFlagTypes } from "../constants/index.js";

const featureFlagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: [
        FeatureFlagTypes.STRING,
        FeatureFlagTypes.BOOLEAN,
        FeatureFlagTypes.INTEGER,
      ],
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String
    }
  },
  { timestamps: true }
);

export default modelWrapper(mongoose.model("FeatureFlag", featureFlagSchema));
