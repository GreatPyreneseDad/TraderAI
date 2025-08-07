import { Router } from 'express';

const router = Router();

router.post('/generate', async (req, res) => {
  // TODO: Implement inference generation
  res.json({ message: 'Inference generation endpoint' });
});

export default router;