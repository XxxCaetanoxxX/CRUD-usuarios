import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query'], })
import jwt from 'jsonwebtoken';


import express from 'express';

const rotas = Router();

//fazer login
rotas.post('/login', async (request, response, next) => {

    const loginUserSchema = z.object({
        name: z.string().min(4),
        senha: z.string().min(4)
    })

    const data = loginUserSchema.parse(request.body)

    const user = await prisma.user.findFirst({
        where: {
            name: data.name
        }
    });

    if(!user){
        const error = new Error('usuario nao encontrado');
        error.status = 404;
        next(error);
    }

    //compara a senha inserida no json com a senha do usuario do banco respectivamente
    const isSenhaValida = await bcrypt.compare(data.senha, user.senha);

    //se a senha do banco e do usuario digitado nao coencidirem
    if (!isSenhaValida) {
        const error = new Error('Senha inválida');
        error.status = 401;
        next(error);
    }

    //cria um token, passando o id e o perfil do usuário, mais a chave secreta, ao final, o tempo de validação do token
    const token = jwt.sign({ userId: user.id, perfil: user.perfil }, process.env.JWT_SECRETY, { expiresIn: '1h' });

    response.status(200).json({ token });
});

//retorna os dados do usuário logado
rotas.get('/usuario', authenticate, async (request, response, next) => {
    const userId = request.user.userId;

    await prisma.user.findFirst({
        where: {
            id: userId
        }
    }).then(user => {
        response.status(200).json(user);
    }).catch(error =>{
        new Error('Usuário não encontrado')
        error.status = 404;
        next(error)
    });

});

//criar usuario
rotas.post('/pessoas', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {

    const createUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.enum(['PADRAO', 'GERENTE', 'ADMIN']),
        senha: z.string().min(4)
    })

    const data = createUserSchema.parse(request.body)

    // pega a senha inserida no json e a codifica
    const senhaCriptografada = await bcrypt.hash(data.senha, 10);

    const user = await prisma.user.create({
        data: {
            name: data.name,
            perfil: data.perfil,
            //cria um usuario com a senha criptografada
            senha: senhaCriptografada
        }
    }).then(user => {
        response.status(201).json(user)
    }).catch(error => {
        error = new Error('Erro ao criar usuário');
        error.status = 401;
        next(error);
    })

})

//recuperar todas as pessoas
rotas.get('/pessoas', authenticate, async (request, response) => {

    const users = await prisma.user.findMany()
    response.status(200).json(users)

})

//recuperar pessoa pelo nome
rotas.get('/pessoas/:name', authenticate, async (request, response, next) => {

    const user = await prisma.user.findFirst({
        where: {
            name: request.params.name
        },
    }).then(user => {
        response.status(200).json(user)
    })

    if (!user) {
        const error = new Error('Usuário não encontrado ao pesquisar pelo nome')
        error.status = 404;
        next(error);
    }


})

//atualizar pessoa por id
rotas.put('/pessoas/:id', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response, next) => {

    const updateUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.enum(['PADRAO', 'GERENTE', 'ADMIN']),
        senha: z.string().min(4)
    })

    const data = updateUserSchema.parse(request.body)
    const id = request.params.id
    //criptografa nova senha
    const senhaCriptografada = await bcrypt.hash(data.senha, 10);

    const user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            name: data.name,
            perfil: data.perfil,
            senha: senhaCriptografada
        },
    }).then(user => {
        response.status(200).json(user)
    }).catch(error => {
        error.message = 'usuário não encontrado pelo id';
        error.status = 404;
        next(error);
    })

})

//deletar pessoa
rotas.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response, next) => {

    const deleteSchema = z.string();

    const id = deleteSchema.parse(request.params.id)

    const user = await prisma.user.delete({
        where: {
            id: id
        }
    }).then(user => {
        response.status(200).json({ message: `Usuário ${user.name} deletado com sucesso` });
    }).catch(error => {
        error.message = 'usuário não encontrado pelo id';
        error.status = 404;
        next(error);
    })

})

export default rotas;