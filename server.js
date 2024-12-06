import express from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken';


const app = express()
const prisma = new PrismaClient()
app.use(express.json())
const { Prisma } = import('@prisma/client');

function authorize(allowedRoles) {
    return (request, response, next) => {
        const { perfil } = request.body;

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
        const decoded = jwt.verify(token, 'sua_chave_secreta');
        request.user = decoded;
        next();
    } catch (error) {
        response.status(403).json({ error: 'Token inválido' })
    }

}

app.post('/login', async (request, response) => {
    const { name, senha } = request.body;

    // Supondo que você tenha um método para encontrar o usuário no banco
    const user = await prisma.user.findFirst({
        where: {
            name: name
        }
    });

    if (!user || user.senha !== senha) {
        return response.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ userId: user.id, perfil: user.perfil }, 'sua_chave_secreta', { expiresIn: '1h' });

    response.status(200).json({ token });
});


app.post('/pessoas', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {
    try {
        await prisma.user.create({
            data: {
                name: request.body.name,
                perfil: request.body.perfil,
                senha: request.body.senha
            }
        })
        response.status(201).json(request.body)
    } catch (error) {
        res.status(400).json({ error: 'Erro ao criar usuário' });
    }
})

app.get('/pessoas', authenticate, authorize(['ADMIN', 'GERENTE', 'PADRAO']), async (request, response) => {

    const users = await prisma.user.findMany()
    response.status(200).json(users)

})

app.get('/pessoas/:name', authenticate, authorize(['ADMIN', 'GERENTE', 'PADRAO']), async (request, response) => {
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


app.put('/pessoas/:id', authenticate, authorize(['ADMIN', 'GERENTE']), async (request, response) => {

    const user = await prisma.user.update({
        where: {
            id: request.params.id
        },
        data: {
            name: request.body.nome,
            perfil: request.body.perfil,
            senha: request.body.senha
        }
    })

    response.json(user)
})

app.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response) => {

    try {

        const user = await prisma.user.delete({
            where: {
                id: request.params.id
            }
        })

        response.status(200).json({ message: `Usuário ${user.name} deletado com sucesso` })

    } catch (error) {
        response.status(404).json({ error: 'Usuário não encontrado' });
    }
})


app.listen(3000)