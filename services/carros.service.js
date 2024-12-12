import { prisma } from '../prisma/prisma_class.js'

export class CarrosService {

    async findCarById(id) {
        const carro = await prisma.carro.findFirst({
            where: {
                id: id
            },
        })
        return carro;
    }

    async createCar(data) {
        const carro = await prisma.carro.create({
            data: {
                nome: data.nome,
                userId: data.userId
            }
        })
        return carro;
    }

    async findAllCars() {
        const carros = await prisma.carro.findMany()
        return carros;
    }

    async deleteCarById(id) {
        await prisma.carro.delete({
            where: {
                id: id
            }
        })
    }
}

