import * as e from 'express';
import authentication from './middleware/authentication';
import GetAllController from './controllers/GetAllController';
import GetController from './controllers/GetController';
import PatchController from './controllers/PatchController';

const router: e.Router = e.Router();

router.get('/users', authentication, (req: e.Request, res: e.Response) =>
	new GetAllController().execute(req, res)
);

router.get(
	'/users/:userID',
	authentication,
	(req: e.Request, res: e.Response) => new GetController().execute(req, res)
);

router.patch(
	'/users/:userID',
	authentication,
	(req: e.Request, res: e.Response) => new PatchController().execute(req, res)
);

export default router;
