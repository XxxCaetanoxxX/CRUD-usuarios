import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../Erros/erros.js';


const prisma = new PrismaClient({ log: ['query'], })
const rotasCarros = Router();

//adicionar carro a lista do usuario
rotasCarros.post('/adicionar/carro', authenticate, async (request, response) => {
    const veiculo = request.body;
    const carro = await prisma.carro.create({
        data: {
            nome: veiculo.nome,
            userId: request.user.userId
        }
    })

    return response.status(201).json(carro);
});

//retornar carros
rotasCarros.get('/retornar/carros', authenticate, async (request, response) => {
    const todosCarros = await prisma.carro.findMany()
    return response.status(200).json(todosCarros);
})

rotasCarros.delete('/remover/carros', authenticate, async (request, response) => {
    const carro = await prisma.carro.delete({
        where
    })
    return response.status(200).json(todosCarros);
})



export default rotasCarros;

