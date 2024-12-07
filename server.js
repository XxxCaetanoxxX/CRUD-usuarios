import express from 'express'
import rotas from './rotas/rotas.js';
import { PrismaClient } from '@prisma/client';


const app = express()
//a  cada query realizada no banco, ira gerar um log
const prisma = new PrismaClient({ log: ['query'], })
//informa que os dados virão no formato json
app.use(express.json())
app.use(rotas);

app.listen(3000, ()=> console.log('Servidor rodando'));