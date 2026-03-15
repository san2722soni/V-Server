import { requireDeveloper, wrapper } from "../middleware.js";
import ExcalidrawBoard from "../../service/dashboard/excalidrawBoard.js";

export default async function excalidrawBoard(fastify) {
    fastify.post('/getBoards',
      { preHandler: [requireDeveloper] },
      wrapper(ExcalidrawBoard.getBoards)
    );

    fastify.post('/getBoard',
      { preHandler: [requireDeveloper] },
      wrapper(ExcalidrawBoard.getBoard)
    );

    fastify.post('/createBoard',
      { preHandler: [requireDeveloper], bodyLimit: 50 * 1024 * 1024 },
      wrapper(ExcalidrawBoard.createBoard)
    );

    fastify.post('/updateBoard',
      { preHandler: [requireDeveloper], bodyLimit: 50 * 1024 * 1024 },
      wrapper(ExcalidrawBoard.updateBoard)
    );

    fastify.post('/cloneBoard',
      { preHandler: [requireDeveloper] },
      wrapper(ExcalidrawBoard.cloneBoard)
    );

    fastify.post('/deleteBoard',
      { preHandler: [requireDeveloper] },
      wrapper(ExcalidrawBoard.deleteBoard)
    );
};
