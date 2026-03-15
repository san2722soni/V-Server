import ExcalidrawBoard from "../../model/ExcalidrawBoard.js";
import config from "../../constants/config.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import LogModule from "../../service/log/index.js";

const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = config;

const S3_BUCKET = "project-v-assets";
const S3_PREFIX = "excalidraw";

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const getBoards = async (data) => {
  try {
    LogModule.log({
      key1: "getExcalidrawBoards",
      key2: "start",
      text1: "Fetching all excalidraw boards",
    });

    const boards = await ExcalidrawBoard.find({ isDeleted: false });
    boards.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    LogModule.log({
      key1: "getExcalidrawBoards",
      key2: "success",
      text1: "Boards retrieved successfully",
      text2: `Count: ${boards.length}`,
    });

    return {
      success: true,
      message: "Boards retrieved successfully",
      data: boards,
    };
  } catch (error) {
    LogModule.error({
      key1: "getExcalidrawBoards",
      key2: "failed",
      text1: "Failed to fetch boards",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getBoard = async (data) => {
  try {
    const { boardId, cachedAt } = data;

    LogModule.log({
      key1: "getExcalidrawBoard",
      key2: "start",
      text1: "Fetching excalidraw board",
      text2: `Board ID: ${boardId}`,
    });

    if (!boardId) {
      return { success: false, message: "Board ID is required" };
    }

    const board = await ExcalidrawBoard.findById(boardId);

    if (!board || board.isDeleted) {
      return { success: false, message: "Board not found" };
    }

    // If client has a cached version and it's still current, skip S3 fetch
    if (cachedAt && new Date(cachedAt) >= new Date(board.updatedAt)) {
      return {
        success: true,
        cached: true,
        message: "Board not modified",
        data: { board },
      };
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: board.s3Key,
    });

    const response = await s3Client.send(command);
    const sceneDataString = await response.Body.transformToString();
    const sceneData = JSON.parse(sceneDataString);

    LogModule.log({
      key1: "getExcalidrawBoard",
      key2: "success",
      text1: "Board retrieved successfully",
      text2: `Board ID: ${boardId}`,
    });

    return {
      success: true,
      message: "Board retrieved successfully",
      data: { board, sceneData },
    };
  } catch (error) {
    LogModule.error({
      key1: "getExcalidrawBoard",
      key2: "failed",
      text1: "Failed to fetch board",
      text2: `Board ID: ${data.boardId}`,
      error: error.message,
      stack: error.stack,
    });

    if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
      return { success: false, message: "Board scene data not found in storage" };
    }

    throw error;
  }
};

const createBoard = async (data) => {
  try {
    const { title, sceneData, userData } = data;
    const email = userData?.email || "unknown";

    LogModule.log({
      key1: "createExcalidrawBoard",
      key2: "start",
      text1: "Creating excalidraw board",
      text2: `Title: ${title}`,
    });

    if (!sceneData) {
      return { success: false, message: "Scene data is required" };
    }

    const board = await ExcalidrawBoard.create({
      title: title || "Untitled Board",
      s3Key: "pending",
      createdBy: email,
      updatedBy: email,
    });

    const s3Key = `${S3_PREFIX}/${board._id}.json`;

    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(sceneData),
      ContentType: "application/json",
    });

    await s3Client.send(putCommand);

    const updatedBoard = await ExcalidrawBoard.findByIdAndUpdate(board._id, { s3Key });

    LogModule.log({
      key1: "createExcalidrawBoard",
      key2: "success",
      text1: "Board created successfully",
      text2: `Board ID: ${board._id}, S3 Key: ${s3Key}`,
    });

    return {
      success: true,
      message: "Board created successfully",
      data: updatedBoard,
    };
  } catch (error) {
    LogModule.error({
      key1: "createExcalidrawBoard",
      key2: "failed",
      text1: "Failed to create board",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const updateBoard = async (data) => {
  try {
    const { boardId, title, sceneData, userData } = data;
    const email = userData?.email || "unknown";

    LogModule.log({
      key1: "updateExcalidrawBoard",
      key2: "start",
      text1: "Updating excalidraw board",
      text2: `Board ID: ${boardId}`,
    });

    if (!boardId) {
      return { success: false, message: "Board ID is required" };
    }

    if (!sceneData) {
      return { success: false, message: "Scene data is required" };
    }

    const board = await ExcalidrawBoard.findById(boardId);

    if (!board || board.isDeleted) {
      return { success: false, message: "Board not found" };
    }

    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: board.s3Key,
      Body: JSON.stringify(sceneData),
      ContentType: "application/json",
    });

    await s3Client.send(putCommand);

    const updateFields = { updatedBy: email };
    if (title !== undefined) {
      updateFields.title = title;
    }

    const updatedBoard = await ExcalidrawBoard.findByIdAndUpdate(boardId, updateFields);

    LogModule.log({
      key1: "updateExcalidrawBoard",
      key2: "success",
      text1: "Board updated successfully",
      text2: `Board ID: ${boardId}`,
    });

    return {
      success: true,
      message: "Board updated successfully",
      data: updatedBoard,
    };
  } catch (error) {
    LogModule.error({
      key1: "updateExcalidrawBoard",
      key2: "failed",
      text1: "Failed to update board",
      text2: `Board ID: ${data.boardId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const cloneBoard = async (data) => {
  try {
    const { boardId, userData } = data;
    const email = userData?.email || "unknown";

    LogModule.log({
      key1: "cloneExcalidrawBoard",
      key2: "start",
      text1: "Cloning excalidraw board",
      text2: `Source Board ID: ${boardId}`,
    });

    if (!boardId) {
      return { success: false, message: "Board ID is required" };
    }

    const sourceBoard = await ExcalidrawBoard.findById(boardId);

    if (!sourceBoard || sourceBoard.isDeleted) {
      return { success: false, message: "Source board not found" };
    }

    const newBoard = await ExcalidrawBoard.create({
      title: `${sourceBoard.title} (Copy)`,
      s3Key: "pending",
      createdBy: email,
      updatedBy: email,
    });

    const newS3Key = `${S3_PREFIX}/${newBoard._id}.json`;

    const copyCommand = new CopyObjectCommand({
      Bucket: S3_BUCKET,
      CopySource: `${S3_BUCKET}/${sourceBoard.s3Key}`,
      Key: newS3Key,
    });

    await s3Client.send(copyCommand);

    const updatedBoard = await ExcalidrawBoard.findByIdAndUpdate(newBoard._id, {
      s3Key: newS3Key,
    });

    LogModule.log({
      key1: "cloneExcalidrawBoard",
      key2: "success",
      text1: "Board cloned successfully",
      text2: `Source: ${boardId}, New: ${newBoard._id}`,
    });

    return {
      success: true,
      message: "Board cloned successfully",
      data: updatedBoard,
    };
  } catch (error) {
    LogModule.error({
      key1: "cloneExcalidrawBoard",
      key2: "failed",
      text1: "Failed to clone board",
      text2: `Source Board ID: ${data.boardId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteBoard = async (data) => {
  try {
    const { boardId } = data;

    LogModule.log({
      key1: "deleteExcalidrawBoard",
      key2: "start",
      text1: "Deleting excalidraw board",
      text2: `Board ID: ${boardId}`,
    });

    if (!boardId) {
      return { success: false, message: "Board ID is required" };
    }

    const board = await ExcalidrawBoard.findById(boardId);

    if (!board) {
      return { success: false, message: "Board not found" };
    }

    await ExcalidrawBoard.findByIdAndUpdate(boardId, { isDeleted: true });

    const deleteCommand = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: board.s3Key,
    });

    await s3Client.send(deleteCommand);

    LogModule.log({
      key1: "deleteExcalidrawBoard",
      key2: "success",
      text1: "Board deleted successfully",
      text2: `Board ID: ${boardId}`,
    });

    return {
      success: true,
      message: "Board deleted successfully",
    };
  } catch (error) {
    LogModule.error({
      key1: "deleteExcalidrawBoard",
      key2: "failed",
      text1: "Failed to delete board",
      text2: `Board ID: ${data.boardId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  cloneBoard,
  deleteBoard,
};
