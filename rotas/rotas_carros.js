import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import { ApiError } from '../Erros/erros.js';
import { prisma } from '../prisma/prisma_class.js'
import { CarrosService } from '../services/carros.service.js';
import { PessoaService } from '../services/pessoa.service.js';




const rotasCarros = Router();
const carrosService = new CarrosService();
const pessoaService = new PessoaService();



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

    const user = await pessoaService.findUserById(request.body.userId)

    if (!user) {
        return next(new ApiError("Usuário com esse ID não foi encontrado", 404))
    }

    const veiculo = request.body;

    const carro = await carrosService.createCar(veiculo);

    return response.status(201).json(carro);
});

//retornar carros
rotasCarros.get('/carros', authenticate, async (request, response) => {
    const todosCarros = await carrosService.findAllCars()
    return response.status(200).json(todosCarros);
})

//retornar carro por id
rotasCarros.get('/carro/:id', authenticate, async (request, response) => {
    const id = request.params.id

    const carro = await carrosService.findCarById(id);
    return response.status(200).json(carro);
})

//deletar carro por id
rotasCarros.delete('/carro/:id', authenticate, async (request, response) => {
    const id = request.params.id

    const veiculoExiste = carrosService.findCarById(id);
    if (!veiculoExiste) {
        return next(new ApiError('Veículo não encontrado pelo id inserido', 404));
    }

    await carrosService.deleteCarById(id)
    return response.status(200).json({ message: `carro deletado foi deletado` });
})



export default rotasCarros;

