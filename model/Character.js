import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const abilityKeySchema = new mongoose.Schema({
    value: { type: Number, default: 0 },
    description: { type: String, default: "" },
}, { _id: false });

const abilitySchema = new mongoose.Schema({
    Key1: { type: abilityKeySchema, default: () => ({}) },
    Key2: { type: abilityKeySchema, default: () => ({}) },
    Key3: { type: abilityKeySchema, default: () => ({}) },
    Key4: { type: abilityKeySchema, default: () => ({}) },
}, { _id: false });

const abilityItemSchema = new mongoose.Schema({
    abilityName: { type: String, required: true },
    abilityData: { type: abilitySchema, default: () => ({}) },
}, { _id: false });

const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      default: 1,
    },
    weight: {
      type: Number,
      default: 0,
    },
    health: {
      type: Number,
      min: [0, "Health cannot be negative"],
      default: 100,
    },
    maxHealth: {
      type: Number,
      min: [0, "Max health cannot be negative"],
      default: 100,
    },
    attackDamage: {
      type: Number,
      default: 0,
    },
    attackType: {
      type: String,
      enum: ["Ranged", "Melee", "Throw"],
      default: "Melee",
    },
    attackRange: {
      type: Number,
      default: 0,
    },
    movement: {
      walkSpeed: {
        type: Number,
        default: 5,
      },
      sprintSpeed: {
        type: Number,
        default: 8,
      },
      strafeSpeed: {
        type: Number,
        default: 4,
      },
      acceleration: {
        type: Number,
        default: 2,
      },
      deceleration: {
        type: Number,
        default: 3,
      },
      rotationSpeed: {
        type: Number,
        default: 180,
      },
      jumpHeight: {
        type: Number,
        default: 2,
      },
    },
    vision: {
      type: Number,
      default: 10,
    },
    inventoryCapacity: {
      type: Number,
      default: 20,
    },
    buildingsCanBuild: {
      type: [String],
      default: [],
    },
    buildingsCanUse: {
      type: [String],
      default: [],
    },
    inventoriesCanUse: {
      type: [String],
      default: [],
    },
    inventoriesCanCraft: {
      type: [String],
      default: [],
    },
    abilities: {
      type: [abilityItemSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default modelWrapper(mongoose.model("Character", characterSchema));
