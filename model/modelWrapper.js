import LogModule from "../service/log/index.js";
import asyncLocalStorage from "../util/asyncStorage.js";

const log = (data, key2, metric) => {
  const txnId = asyncLocalStorage.getStore();
  LogModule.log({
    data: JSON.stringify(data),
    key1: "mongoQueries",
    key2,
    txnId,
    metric,
  });
};

const find = (Model) => async (data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.find(data).session(session)
    : Model.find(data);
  const result = await promise;
  log({ data, result }, Model.modelName + ".find", Date.now() - startTime);
  return result;
};

const findAndPopulate = (Model) => async (data, field, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.find(data).populate(field).session(session)
    : Model.find(data).populate(field);
  const result = await promise;
  log(
    { data, field, result },
    Model.modelName + ".findAndPopulate",
    Date.now() - startTime
  );
  return result;
};

const findAndSelect = (Model) => async (data, select, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.find(data).select(select).session(session)
    : Model.find(data).select(select);
  const result = await promise;
  log(
    { data, select, result },
    Model.modelName + ".findAndSelect",
    Date.now() - startTime
  );
  return result;
};

const findOne = (Model) => async (data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findOne(data).session(session)
    : Model.findOne(data);
  const result = await promise;
  log({ data, result }, Model.modelName + ".findOne", Date.now() - startTime);
  return result;
};

const findOneAndPopulate = (Model) => async (data, field, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findOne(data).populate(field).session(session)
    : Model.findOne(data).populate(field);
  const result = await promise;
  log(
    { data, field, result },
    Model.modelName + ".findOnePopulate",
    Date.now() - startTime
  );
  return result;
};

const findOneAndSelect = (Model) => async (data, select, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findOne(data).select(select).session(session)
    : Model.findOne(data).select(select);
  const result = promise;
  log(
    { data, select, result },
    Model.modelName + ".findOneAndSelect",
    Date.now() - startTime
  );
  return result;
};

// const findOneAndUpdate = (Model) => async (data, updateData, session) => {
//     const startTime = Date.now();
//     const promise = session
//         ? Model.findOneAndUpdate(data, updateData, { new: true }).session(session)
//         : Model.findOneAndUpdate(data, updateData, { new: true });
//     const result = await promise;
//     log({ data, updateData, result }, Model.modelName + '.findOneAndUpdate', Date.now() - startTime);
//     return result;
// };

const findOneAndUpdate =
  (Model) =>
  async (data, updateData, options = {}) => {
    const { session, upsert, ...otherOptions } = options;
    const startTime = Date.now();

    const baseOptions = {
      new: true,
      ...otherOptions,
    };

    // Handle upsert option separately
    if (upsert) {
      baseOptions.upsert = true;
    }

    let promise;

    if (session) {
      // Check if we need to handle transaction for upsert
      if (upsert) {
        // For upsert with session, we need to be in a transaction
        // This is the caller's responsibility, but we can warn
        if (!session.inTransaction()) {
          console.warn(
            "Upsert operation with session should be in a transaction for best practices"
          );
        }
      }

      promise = Model.findOneAndUpdate(data, updateData, {
        ...baseOptions,
        session: session,
      });
    } else {
      promise = Model.findOneAndUpdate(data, updateData, baseOptions);
    }

    const result = await promise;
    log(
      { data, updateData, result, options },
      Model.modelName + ".findOneAndUpdate",
      Date.now() - startTime
    );
    return result;
  };

const create = (Model) => async (data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.create(data, { session })
    : Model.create(data);
  const result = await promise;
  log({ data, result }, Model.modelName + ".create", Date.now() - startTime);
  return result;
};

const findById = (Model) => async (id, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findById(id).session(session)
    : Model.findById(id);
  const result = await promise;
  log({ id, result }, Model.modelName + ".findById", Date.now() - startTime);
  return result;
};

const findByIdAndSelect = (Model) => async (id, select, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findById(id).select(select).session(session)
    : Model.findById(id).select(select);
  const result = await promise;
  log(
    { id, select, result },
    Model.modelName + ".findByIdAndSelect",
    Date.now() - startTime
  );
  return result;
};

const findByIdAndUpdate = (Model) => async (id, data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findByIdAndUpdate(id, data, { new: true }).session(session)
    : Model.findByIdAndUpdate(id, data, { new: true });
  const result = await promise;
  log(
    { id, data, result },
    Model.modelName + ".findByIdAndUpdate",
    Date.now() - startTime
  );
  return result;
};

const deleteOne = (Model) => async (data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.deleteOne(data).session(session)
    : Model.deleteOne(data);
  const result = await promise;
  log({ data, result }, Model.modelName + ".deleteOne", Date.now() - startTime);
  return result;
};

const updateOne = (Model) => async (filter, update, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.updateOne(filter, update).session(session)
    : Model.updateOne(filter, update);
  const result = await promise;
  log(
    { filter, update, result },
    Model.modelName + ".updateOne",
    Date.now() - startTime
  );
  return result;
};

// delete mongodb
const findByIdAndDelete = (Model) => async (id, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.findByIdAndDelete(id).session(session)
    : Model.findByIdAndDelete(id);
  const result = await promise;
  log(
    { id, result },
    Model.modelName + ".findByIdAndDelete",
    Date.now() - startTime
  );
  return result;
};

// cound mongodb
const countDocuments =
  (Model) =>
  async (filter = {}, session) => {
    const startTime = Date.now();
    const promise = session
      ? Model.countDocuments(filter).session(session)
      : Model.countDocuments(filter);
    const result = await promise;
    log(
      { filter, result },
      Model.modelName + ".countDocuments",
      Date.now() - startTime
    );
    return result;
  };

// update many mongodb
const updateMany =
  (Model) =>
  async (filter = {}, update = {}, session) => {
    const startTime = Date.now();

    if (!update || Object.keys(update).length === 0) {
      throw new Error("Update parameter cannot be empty");
    }

    const promise = session
      ? Model.updateMany(filter, update).session(session)
      : Model.updateMany(filter, update);
    const result = await promise;
    log(
      { filter, update, result },
      Model.modelName + ".updateMany",
      Date.now() - startTime
    );
    return result;
  };

const insertMany = (Model) => async (data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.insertMany(data, { session })
    : Model.insertMany(data);
  const result = await promise;
  log(
    { dataCount: data.length, result },
    Model.modelName + ".insertMany",
    Date.now() - startTime
  );
  return result;
};

const deleteMany = (Model) => async (data, session) => {
  const startTime = Date.now();
  const promise = session
    ? Model.deleteMany(data, { session })
    : Model.deleteMany(data);
  const result = await promise;
  log(
    { dataCount: data.length, result },
    Model.modelName + ".deleteMany",
    Date.now() - startTime
  );
  return result;
};

const Wrapper = (Model) => {
  return {
    find: find(Model),
    findAndPopulate: findAndPopulate(Model),
    findAndSelect: findAndSelect(Model),
    findOne: findOne(Model),
    findOneAndPopulate: findOneAndPopulate(Model),
    findOneAndSelect: findOneAndSelect(Model),
    findOneAndUpdate: findOneAndUpdate(Model),
    create: create(Model),
    findById: findById(Model),
    findByIdAndSelect: findByIdAndSelect(Model),
    findByIdAndUpdate: findByIdAndUpdate(Model),
    deleteOne: deleteOne(Model),
    updateOne: updateOne(Model),
    updateMany: updateMany(Model),
    findByIdAndDelete: findByIdAndDelete(Model),
    countDocuments: countDocuments(Model),
    insertMany: insertMany(Model),
    deleteMany: deleteMany(Model)
  };
};

export default Wrapper;
