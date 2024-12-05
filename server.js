import express from 'express'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
app.use(express.json())

app.post('/pessoas', async (request, response) => {

    await prisma.user.create({
        data: {
            name: request.body.name,
            perfil: request.body.perfil,
            senha: request.body.senha
        }
    })

    response.status(201).json(request.body)
})

app.get('/pessoas', async (request, response) => {

    const users = await prisma.user.findMany()
    response.status(200).json(users)

})

app.get('/pessoas/:name', async (request, response) => {
    const user = await prisma.user.findFirst({
        where: {
            name: request.params.name
        },
    })
    response.json(user)
})


app.put('/pessoas/:id', async (request, response) => {

    const res = await prisma.user.update({
        where: {
            id: request.params.id
        },
        data: {
            name: request.body.nome,
            perfil: request.body.perfil,
            senha: request.body.senha
        }
    })

    response.json(res)
})

app.delete('/pessoas/:id', async (request, response) => {

    const user = await prisma.user.delete({
        where: {
            id: request.params.id
        }
    })

    response.status(200).json({ message: `Usuário  ${user.name} deletado` })
})


app.listen(3000)


// caetano
// @Teste123