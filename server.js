import express from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken';


const app = express()
//a  cada query realizada no banco, ira gerar um log
const prisma = new PrismaClient({ log: ['query'], })
app.use(express.json())
const { Prisma } = import('@prisma/client');
import { z } from 'zod'

function authorize(allowedRoles) {
    return (request, response, next) => {
        const { perfil } = request.user; //recupera o perfil da pessoa logada

        if (!perfil || !allowedRoles.includes(perfil.toUpperCase())) {
            return response.status(403).json({ error: 'Acesso negado: você não tem permissão para realizar esta ação' })
        }

        next();
    };
}

function authenticate(request, response, next) {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) return response.status(401).json({ error: 'Token não fornecido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRETY);
        request.user = decoded;
        next();
    } catch (error) {
        console.log(process.env.JWT_SECRETY)
        console.log(error)
        response.status(401).json({ error: 'Token inválido' })
    }

}


//fazer login
app.post('/login', async (request, response) => {

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

        if (!user || user.senha !== data.senha) {
            return response.status(401).json({ error: 'Credenciais inválidas' });
        }

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

//criar usuario
app.post('/pessoas', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {

    const createUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.string().min(5),
        senha: z.string().min(4)
    })

    try {
        const data = createUserSchema.parse(request.body)

        const user = await prisma.user.create({
            data: {
                name: data.name,
                perfil: data.perfil,
                senha: data.senha
            }
        })
        response.status(201).json(user)
    } catch (error) {
        console.log(error)
        response.status(400).json({ error: 'Erro ao criar usuário' });
    }
})

//recuperar todas as pessoas
app.get('/pessoas', authenticate ,async (request, response) => {

    const users = await prisma.user.findMany()
    response.status(200).json(users)

})

//recuperar pessoa pelo nome
app.get('/pessoas/:name', async (request, response) => {
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
app.put('/pessoas/:id', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {

    const updateUserSchema = z.object({
        name: z.string().min(4),
        perfil: z.string().min(5),
        senha: z.string().min(4)
    })

    try {
        const data = updateUserSchema.parse(request.body)
        const id = request.params.id

        const user = await prisma.user.update({
            where: {
                id: id
            },
            data: data,
        })

        response.json(user)

    } catch (error) {
        response.status(400).json({ error: 'Erro ao atualzizar usuário' });
    }
})

//deletar pessoa
app.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response) => {

    const deleteSchema = z.string().uuid("O ID deve ser válido");

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


app.listen(3000)