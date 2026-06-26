import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Sistema Auditoría Backend');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
