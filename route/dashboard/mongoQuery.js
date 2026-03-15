import { wrapper, requireDeveloper, requireAdmin } from '../middleware.js';
import MongoService from '../../service/dashboard/mongoService.js';

export default async function mongoQuery(fastify){
    fastify.post('/mongoQuery',  {preHandler: requireAdmin } ,wrapper(MongoService.runQuery));
}