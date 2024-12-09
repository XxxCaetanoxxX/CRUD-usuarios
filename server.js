import express from 'express'
import rotas from './rotas/rotas.js';
import { PrismaClient } from '@prisma/client';

const app = express()
//a  cada query realizada no banco, ira gerar um log
const prisma = new PrismaClient({ log: ['query'], })
//informa que os dados virão no formato json
app.use(express.json())
app.use(rotas);

app.use((err, req, res, next) => {
    // status padrão se não estiver definido
    const statusCode = err.status || 500;
  
    // Retorna a resposta do erro
    res.status(statusCode).json({
      error: {
        message: err.message || 'Erro interno do servidor',
      },
    });
  });

app.listen(3000, ()=> console.log('Servidor rodando'));