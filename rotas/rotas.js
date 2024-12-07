import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query'], })
import jwt from 'jsonwebtoken';



const rotas = Router();

//fazer login
rotas.post('/login', async (request, response) => {

    const loginUserSchema = z.object({
        name: z.string().min(4),
        senha: z.string().min(4)
    })

    try {
        const data = loginUserSchema.parse(request.body)

        const user = await prisma.user.findFirst({
            where: {
                name: data.name
            }
        });

        if (!user) {
            return response.status(401).json({ error: 'usuário inválido' });
        }

        //compara a senha inserida no json com a senha do usuario do banco respectivamente
        const isSenhaValida = await bcrypt.compare(data.senha, user.senha);

        //se a senha do banco e do usuario digitado nao coencidirem
        if(!isSenhaValida){
            return response.status(401).json({error: 'senha inválidas'});
        }

        //cria um token, passando o id e o perfil do usuário, mais a chave secreta, ao final, o tempo de validação do token
        const token = jwt.sign({ userId: user.id, perfil: user.perfil }, process.env.JWT_SECRETY, { expiresIn: '1h' });

        response.status(200).json({ token });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return response.status(400).json({ error: error.errors })
        } else {
            console.error('Erro no login:', error);
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    }


});

//retorna os dados do usuário logado
rotas.get('/usuario', authenticate, async (request, response) => {
    try {
        const userId = request.user.userId;

        const user = await prisma.user.findFirst({
            where: {
                id: userId
            }
        });

        if (!user) {
            return response.status(404).json({ error: 'Usuário não enconttrado' });
        }

        response.status(200).json(user);
    } catch (error) {
        console.log(error);
        response.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

//criar usuario
rotas.post('/pessoas', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {

    const createUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.string().min(5),
        senha: z.string().min(4)
    })

    try {
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
        })
        response.status(201).json(user)
    } catch (error) {
        console.log(error)
        response.status(400).json({ error: 'Erro ao criar usuário' });
    }
})

//recuperar todas as pessoas
rotas.get('/pessoas', authenticate, async (request, response) => {

    const users = await prisma.user.findMany()
    response.status(200).json(users)

})

//recuperar pessoa pelo nome
rotas.get('/pessoas/:name', authenticate, async (request, response) => {
    try {
        const user = await prisma.user.findFirst({
            where: {
                name: request.params.name
            },
        })
        if (user == null) {
            response.status(404).json({ erro: "Nome de usuario não encontrado" })
        } else {
            response.json(user)
        }
    } catch (error) {
        response.status(404).json({ error: "Nome de usuario não encontrado" })
    }

})

//atualizar pessoa por id
rotas.put('/pessoas/:id', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {

    const updateUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.string().min(5),
        senha: z.string().min(4)
    })

    try {
        const data = updateUserSchema.parse(request.body)
        const id = request.params.id
        const senhaCriptografada = await bcrypt.hash(data.senha, 10);


        const user = await prisma.user.update({
            where: {
                id: id
            },
            data: {
                name:data.name,
                perfil:data.perfil,
                senha: senhaCriptografada
            },
        })

        response.json(user)

    } catch (error) {
        response.status(400).json({ error: 'Erro ao atualzizar usuário' });
    }
})

//deletar pessoa
rotas.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response) => {

    const deleteSchema = z.string();

    try {
        const id = deleteSchema.parse(request.params.id)

        const user = await prisma.user.delete({
            where: {
                id: id
            }
        })

        response.status(200).json({ message: `Usuário ${user.name} deletado com sucesso` })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return response.status(400).json({ error: error.errors });
        } else {
            response.status(404).json({ error: 'Usuário não encontrado' });
        }
    }
})

export default rotas;