import * as e from 'express';
import authentication from './middleware/authentication';
import GetAllController from './controllers/GetAllController';
import GetController from './controllers/GetController';

const router: e.Router = e.Router();

//we modified e.Request globally, need to use any to avoid conflict

router.get('/users', authentication(), (req: any, res: e.Response) =>
	new GetAllController().execute(req, res)
);

router.get('/users/:userID', authentication(), (req: any, res: e.Response) =>
	new GetController().execute(req, res)
);

// router.patch('/users/:userID', authentication(), (req: any, res: e.Response) =>
// 	// new GetController().execute(req, res)
// );

export default router;
