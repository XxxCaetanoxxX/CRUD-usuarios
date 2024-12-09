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

    prisma.user
        .findFirst({
            where: { name: data.name },
        })
        // then nao suporta await
        .then(user => {
            if (!user) {
                const error = new Error('Usuário não encontrado');
                error.status = 404;
                throw error; //lança o erro para o catch
            }

            // then nao suporta await
            // Compara a senha
            return bcrypt.compare(data.senha, user.senha).then(isSenhaValida => {
                if (!isSenhaValida) {
                    const error = new Error('Senha inválida');
                    error.status = 401;
                    throw error;
                }

                // Gera o token JWT
                const token = jwt.sign(
                    { userId: user.id, perfil: user.perfil },
                    process.env.JWT_SECRETY,
                    { expiresIn: '2h' }
                );

                response.status(200).json({ token });
            });
        })
        .catch(error => next(error));
});

//retorna os dados do usuário logado
rotas.get('/usuario', authenticate, async (request, response, next) => {
    const userId = request.user.userId;

    await prisma.user.findFirst({
        where: {
            id: userId
        }
    }).then(user => {

        if (!user) {
            const error = new Error('usuário não identificado');
            error.status = 404;
            throw error;
        }

        response.status(200).json(user);
    }).catch(error => next(error));

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

    //recuopera nome e vê se o parametro foi passado corretamente
    const name = request.params.name.trim();
    if (!name || name == "") {
        const error = new Error('Nome vazio')
        error.status = 401
        return next(error);
    }

    //verifica se o usuario existe
    const user = await  prisma.user.findFirst({
        where: {
            name: name
        }
    });

    //se não existir, lança um erro e encerra o processo
    if (!user) {
        const error = new Error(`usuário com o nome ${name} não encontrado`)
        error.status = 404;
        return next(error);
    }

    await prisma.user.findFirst({
        where: {
            name: name
        },
    }).then(user => {
        response.status(200).json(user)
    }).catch(error => next(error));

})

//atualizar pessoa por id
rotas.put('/pessoas/:id', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response, next) => {

    const updateUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.enum(['PADRAO', 'GERENTE', 'ADMIN']),
        senha: z.string().min(4)
    })

    const data = updateUserSchema.parse(request.body)
    const id = request.params.id?.trim();
    //verifica se tem um id
    if (!id) {
        const error = new Error('id invalido')
        error.status = 401
        return next(error);
    }

    //criptografa nova senha
    const senhaCriptografada = await bcrypt.hash(data.senha, 10);

    //verifica se existe um usuario com o id inserido na url
    const user = await prisma.user.findFirst({
        where: { id },
    })

    //se não existir, lanca um erro e interrompe o processo
    if (!user) {
        const error = new Error('Usuário não encontrado pelo id');
        error.status = 404;
        return next(error); // Interrompe a execução se o usuário não for encontrado
    }

    await prisma.user.update({
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
    }).catch(error => next(error))

})

//deletar pessoa
rotas.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response, next) => {

    const id = request.params.id?.trim();
    //verifica se tem um id
    if (!id) {
        const error = new Error('id invalido')
        error.status = 401
        return next(error);
    }

    //verifica se existe um usuario com o id inserido na url
    const user = await prisma.user.findFirst({
        where: { id },
    });

    if (!user) {
        const error = new Error('usuário não encontrado pelo id')
        error.status = 404
        return next(error);
    }

    await prisma.user.delete({
        where: {
            id: id
        }
    }).then(user => {
        response.status(200).json({ message: `Usuário ${user.name} deletado com sucesso` });
    }).catch(error => {
        next(error);
    })

})

export default rotas;