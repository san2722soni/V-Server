import { requireAdmin, wrapper } from "../middleware.js";
import Developer from "../../service/dashboard/developer.js";

export default async function developer(fastify) {
    // CREATE - Create new developer
    fastify.post('/createDeveloper',  
      { preHandler: [requireAdmin] }, 
      wrapper(Developer.createDeveloper)
    );
    
    // READ - Get all developers
    fastify.post('/getDevelopers',  
      { preHandler: [requireAdmin] }, 
      wrapper(Developer.getDevelopers)
    );
    
    // READ - Get single developer by ID
    fastify.post('/getDeveloper',  
      { preHandler: [requireAdmin] }, 
      wrapper(Developer.getDeveloper)
    );
    
    // UPDATE - Update developer
    fastify.post('/updateDeveloper',  
      { preHandler: [requireAdmin] }, 
      wrapper(Developer.updateDeveloper)
    );
    
    // DELETE - Delete developer
    fastify.post('/deleteDeveloper',  
      { preHandler: [requireAdmin] }, 
      wrapper(Developer.deleteDeveloper)
    );
};