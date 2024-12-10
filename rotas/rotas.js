import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query'], })
import jwt from 'jsonwebtoken';
import { ApiError } from '../Erros/erros.js';


import express from 'express';

const rotas = Router();

//fazer login
rotas.post('/login', async (request, response, next) => {

    const loginUserSchema = z.object({
        name: z.string().min(4, "Nome deve ter mais do que 4 caracteres"),
        senha: z.string().min(4, "Senha deve ter mais do que  caracteres")
    })

    const validationResult = loginUserSchema.safeParse(request.body)
    if (!validationResult.success) {
        return next(validationResult.error);
    }

    const data = loginUserSchema.parse(request.body)

    const user = await prisma.user
        .findFirst({
            where: { name: data.name },
        });

    if (!user) {
        return next(new ApiError('Usuário não encontrado', 404));
    }

    // Compara a senha
    return bcrypt.compare(data.senha, user.senha).then(isSenhaValida => {
        if (!isSenhaValida) {
            return next(new ApiError('Senha inválida', 401));
        }

        // Gera o token JWT
        const token = jwt.sign(
            { userId: user.id, perfil: user.perfil },
            process.env.JWT_SECRETY,
            { expiresIn: '2h' }
        );

        response.status(200).json({ token });
    });


});

//retorna os dados do usuário logado
rotas.get('/usuario/logado', authenticate, async (request, response, next) => {
    const userId = request.user.userId;

    const user = await prisma.user.findFirst({
        where: {
            id: userId
        }
    });

    if (!user) {
        return next(new ApiError('Usuário não encontrado', 404));
    }

    response.status(200).json(user);


});

//criar usuario
rotas.post('/pessoas', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response, next) => {

    const createUserSchema = z.object({
        name: z.string().min(4, "o Nome deve ter pelo menos 4 caracteres"),
        perfil: z.enum(['PADRAO', 'GERENTE', 'ADMIN'], "o perfil deve ser PADRAO, GERENTE ou ADMIN"),
        senha: z.string().min(4, "a senha deve ocnter pelo menos 4 caracteres")
    })

    const validationResult = createUserSchema.safeParse(request.body)
    if (!validationResult.success) {
        return next(validationResult.error);
    }

    const data = validationResult.data;

    // pega a senha inserida no json e a codifica
    const senhaCriptografada = await bcrypt.hash(data.senha, 10);

    const user = await prisma.user.create({
        data: {
            name: data.name,
            perfil: data.perfil,
            //cria um usuario com a senha criptografada
            senha: senhaCriptografada
        }
    });

    response.status(201).json(user)
})

//recuperar todas as pessoas
rotas.get('/pessoas', authenticate, async (request, response) => {

    const users = await prisma.user.findMany()
    response.status(200).json(users)

})

//recuperar pessoa pelo nome
rotas.get('/pessoas/:name', authenticate, async (request, response, next) => {
    //recuopera nome e vê se o parametro foi passado corretamente
    const name = request.params.name.trim();
    if (!name || name == "") {
        return next(new ApiError('Nome vazio', 400));
    }

    //verifica se o usuario existe
    const user = await prisma.user.findFirst({
        where: {
            name: name
        }
    });

    //se não existir, lança um erro e encerra o processo
    if (!user) {
        return next(new ApiError(`usuário com o nome ${name} não encontrado`, 404));
    }

    response.status(200).json(user);

})

//recuperando pessoa por id
rotas.get('/usuario/:id', authenticate, async (request, response, next)=>{
    const id = request.params.id?.trim() || null;

    if(!id){
        return next(new ApiError("O id não pode ser nulo", 400));
    }

    const user = await prisma.user.findFirst({
        where: {
             id
        }
    });

    if(!user){
        return next(new ApiError("O com id fornecido não foi encontrado", 404));
    }

    response.status(200).json(user);


})

//atualizar pessoa por id
rotas.put('/pessoas/:id', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response, next) => {

    const updateUserSchema = z.object({
        name: z.string().min(4, "o Nome deve ter pelo menos 4 caracteres"),
        perfil: z.enum(['PADRAO', 'GERENTE', 'ADMIN'], "o perfil deve ser PADRAO, GERENTE ou ADMIN"),
        senha: z.string().min(4, "a senha deve conter pelo menos 4 caracteres")
    })

    //validar todos os dados do zod
    const validationResult = updateUserSchema.safeParse(request.body);
    if (!validationResult.success) {
        return next(validationResult.error);
    }


    const data = updateUserSchema.parse(request.body)
    const id = request.params.id?.trim();
    //verifica se tem um id
    if (!id) {
        return next(new ApiError('Id inválido', 401));
    }

    //criptografa nova senha
    const senhaCriptografada = await bcrypt.hash(data.senha, 10);

    //verifica se existe um usuario com o id inserido na url
    let user = await prisma.user.findFirst({
        where: { id },
    })

    //se não existir, lanca um erro e interrompe o processo
    if (!user) {
        return next(new ApiError('Usuário não encontrado', 404));
        // Interrompe a execução se o usuário não for encontrado
    }

    user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            name: data.name,
            perfil: data.perfil,
            senha: senhaCriptografada
        },
    });
    return response.status(200).json(user)

})

//deletar pessoa
rotas.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response, next) => {

    const id = request.params.id?.trim();
    //verifica se tem um id
    if (!id) {
        return next(new ApiError('Usuário não encontrado', 401));
    }

    //verifica se existe um usuario com o id inserido na url
    const user = await prisma.user.findFirst({
        where: { id },
    });

    if (!user) {
        return next(new ApiError('Usuário não encontrado pelo id inserido', 404));
    }

    await prisma.user.delete({
        where: {
            id: id
        }
    });
    return response.status(200).json({ message: `Usuário ${user.name} deletado com sucesso` });
})

export default rotas;