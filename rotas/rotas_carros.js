import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import { ApiError } from '../Erros/erros.js';
import { prisma } from '../prisma/prisma_class.js'



const rotasCarros = Router();

//adicionar carro a lista do usuario
rotasCarros.post('/carros', authenticate, authorize(['GERENTE', 'ADMIN']), async (request, response, next) => {

    const createCarSchema = z.object({
        nome: z.string().min(4, "Nome do carro deve ter mais do que 4 caracters"),
        userId: z.string().min(20, "Id inválido"),
    })

    const validationResult = createCarSchema.safeParse(request.body)
    if (!validationResult.success) {
        return next(validationResult.error)
    }

    const user = await prisma.user.findFirst({
        where: { id: request.body.userId }
    })

    if (!user) {
        return next(new ApiError("Usuário com esse ID não foi encontrado", 404))
    }

    const veiculo = request.body;
    const carro = await prisma.carro.create({
        data: {
            nome: veiculo.nome,
            userId: veiculo.userId
        }
    })

    return response.status(201).json(carro);
});

//retornar carros
rotasCarros.get('/carros', authenticate, async (request, response) => {
    const todosCarros = await prisma.carro.findMany()
    return response.status(200).json(todosCarros);
})

//deletar carro por id
rotasCarros.delete('/carro/:id', authenticate, async (request, response) => {
    const id = request.params.id

    const carro = await prisma.carro.delete({
        where: {
            id: id
        }
    })
    return response.status(200).json({ message: `carro ${carro.nome} foi deletado` });
})



export default rotasCarros;

