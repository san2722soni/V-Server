import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const customGameSchema = new mongoose.Schema(
  {
    saltKey: {
      type: String,
    },
    createdByLobby: {
      type: String,
      required: true,
    },
    creatorId: {
      type: String,
      required: true,
    },
    players: {
      type: [
        {
          userId: {
            type: String,
          },
          secret: {
            type: String,
          },
          characterId: {
            type: String,
          },
          clientId: {
            type: Number,
          },
          team: {
            type: String,
            enum: ["A", "B"],
            default: "A",
          },
          isBot: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    teams: {
      teamA: [
        {
          userId: String,
          clientId: Number,
        },
      ],
      teamB: [
        {
          userId: String,
          clientId: Number,
        },
      ],
    },
    teamTrees: {
      type: Object,
      default: {},
    },
    totalPlayers: {
      type: Number,
      default: 0,
    },
    serverIP: {
      type: String,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    ec2InstanceIds: {
      type: Object,
    },
  },
  { timestamps: true }
);

export default modelWrapper(mongoose.model("CustomGame", customGameSchema));
