import { prisma } from '../prisma/prisma_class.js'
import bcrypt from 'bcrypt';

export class PessoaService {

    async findUserByName(name) {
        const user = await prisma.user.findFirst({
            where: {
                name: name
            },
            include: {
                carros: true
            }
        });
        return user;
    }

    async findUserById(id) {
        const user = await prisma.user.findFirst({
            where: {
                id: id
            },
            include: {
                carros: true,
            }
        })
        return user;
    }

    async createUser(data) {
        const user = await prisma.user.create({
            data: {
                name: data.name,
                perfil: data.perfil,
                senha: await bcrypt.hash(data.senha, 10)
            }
        })
        return user;
    }

    async findMany() {
        const users = await prisma.user.findMany({
            include: {
                carros: true,
            }
        })
        return users;
    }

    async updateUserById(id, data, senhaCriptografada) {
        const user = await prisma.user.update({
            where: {
                id: id
            },
            data: {
                name: data.name,
                perfil: data.perfil,
                senha: senhaCriptografada
            }
        })
        return user;
    }

    async deleteUserById(id) {
        await prisma.user.delete({
            where: {
                id: id
            }
        })
    }
}

