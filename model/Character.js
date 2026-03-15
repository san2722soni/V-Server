import mongoose from "mongoose";
import shieldSchema from "./Shield.js";
import inventorySchema from "./Inventory.js";
import modelWrapper from "./modelWrapper.js";

const characterSchema = new mongoose.Schema(
  {
    health: {
      type: Number,
      min: [0, "Health cannot be negative"],
    },
    maxHealth: {
      type: Number,
    },
    isActive: {
      type: Boolean,
    },
    isStun: {
      type: Boolean,
    },
    tribe: {
      type: String,
    },
    availableRole: {
      type: [String],
      enum: ["Chief", "General", "Warden"],
    },
    moveSpeed: {
      type: Number,
    },
    attackType: {
      type: String,
      enum: ["Ranged", "Melee"],
    },
    attackRange: {
      type: Number,
    },
    level: {
      type: Number,
    },
    shield: {
      type: [shieldSchema],
    },
    isVisible: {
      type: Boolean,
    },
    activeShield: {
      type: Number,
    },
    vision: {
      type: Number,
    },
    target: {
      type: Number,
    },
    weight: {
      type: Number,
    },
    inventory: {
      type: inventorySchema,
    },
    buildingsCanBuild: {
      type: [String],
    },
    buildingsCanUse: {
      type: [String],
    },
    artifactsCanUse: {
      type: [String],
    },
    artifactsCanCraft: {
      type: [String],
    },
    resourcesCanCraft: {
      type: [String],
    },
    abilities: {
      type: [
        new mongoose.Schema(
          {
            description: {
              type: String,
              required: true,
            },
            v1: {
              key: { type: String },
              value: { type: mongoose.Schema.Types.Mixed },
            },
            v2: {
              key: { type: String },
              value: { type: mongoose.Schema.Types.Mixed },
            },
            v3: {
              key: { type: String },
              value: { type: mongoose.Schema.Types.Mixed },
            },
            v4: {
              key: { type: String },
              value: { type: mongoose.Schema.Types.Mixed },
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    name: {
      type: String,
      default: "Unnamed Hero",
    },
    weapon: {
      type: String,
      default: "Salwar Mai Talwar",
    },
  },
  { timestamps: true }
);

export default modelWrapper(mongoose.model("Character", characterSchema));
