import express from 'express'
import rotas from './rotas/rotas.js';
import { PrismaClient } from '@prisma/client';
import { ApiError } from './Erros/erros.js';
import { z } from 'zod'
import rotasCarros from './rotas/rotas_carros.js'


const app = express()
//a  cada query realizada no banco, ira gerar um log
const prisma = new PrismaClient({ log: ['query'], })
//informa que os dados virão no formato json
app.use(express.json())
app.use(rotas);
app.use(rotasCarros);

app.use((err, req, res, next) => {
  // status padrão se não estiver definido
  const statusCode = err.status || 500;
  const msg = err.message

  if (err instanceof z.ZodError) {

    const messages = err.errors.map((issue) => issue.message);

    return res.status(400).json({
      errors: messages,
    });
  }

  if (err instanceof ApiError) {
    return res.status(statusCode).json({ msg })
  }

  // Retorna a resposta do erro
  res.status(statusCode).json({
    error: {
      message: err.message || 'Erro interno do servidor',
    },
  });
});

app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, () => console.log('Servidor rodando'));

// COMANDS
// npm run dev
// npx prisma studio
// node --env-file=.env server.js
// npx prisma init
// npx prisma db push
//
//
//
//
//
//
//
//
//
//