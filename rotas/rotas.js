import { Router } from 'express';
import { authenticate, authorize } from './middlewares.js';
import { z } from 'zod'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from '../Erros/erros.js';
import { prisma } from '../prisma/prisma_class.js'
import { PessoaService } from '../services/pessoa.service.js';

const rotas = Router();
const pessoaService = new PessoaService();

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

    const user = await pessoaService.findUserByName(data.name);

    if (!user) {
        return next(new ApiError('Usuário não encontrado', 404));
    }

    //compara senha
    const isSenhaValida = await bcrypt.compare(data.senha, user.senha);
    if (!isSenhaValida) {
        return next(new ApiError('Senha inválida', 401));
    }

    //gera token
    const token = jwt.sign(
        { userId: user.id, perfil: user.perfil },
        process.env.JWT_SECRETY,
        { expiresIn: '2h' }
    );

    return response.status(200).json({ token });
});

//retorna os dados do usuário logado
rotas.get('/usuario/logado', authenticate, async (request, response, next) => {
    const userId = request.user.userId;

    const user = await pessoaService.findUserById(userId)

    if (!user) {
        return next(new ApiError('Usuário não encontrado', 404));
    }
    return response.status(200).json(
        {
            id: user.id,
            name: user.name,
            perfil: user.perfil
        }
    );
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

    const user = await pessoaService.createUser(data, senhaCriptografada);

    return response.status(201).json({
        id: user.id,
        name: user.name,
        perfil: user.perfil
    })
})

//recuperar todas as pessoas
rotas.get('/pessoas', authenticate, async (request, response) => {

    const users = await pessoaService.findMany();

    //map com dados que serão retornados
    const userData = users.map(user => ({
        id: user.id,
        name: user.name,
        perfil: user.perfil
    }));

    return response.status(200).send(JSON.stringify(userData, null, 4));

})

//recuperar pessoa pelo nome
rotas.get('/pessoas/:name', authenticate, async (request, response, next) => {
    //recuopera nome e vê se o parametro foi passado corretamente
    const name = request.params.name.trim();
    if (!name || name == "") {
        return next(new ApiError('Nome vazio', 400));
    }

    //verifica se o usuario existe
    const user = await pessoaService.findUserByName(name);

    //se não existir, lança um erro e encerra o processo
    if (!user) {
        return next(new ApiError(`usuário com o nome ${name} não encontrado`, 404));
    }

    return response.status(200).json({
        id: user.id,
        name: user.name,
        perfil: user.perfil
    });

})

//recuperando pessoa por id
rotas.get('/usuario/:id', authenticate, async (request, response, next) => {
    const id = request.params.id?.trim() || null;

    if (!id) {
        return next(new ApiError("O id não pode ser nulo", 400));
    }

    const user = await pessoaService.findUserById(id);

    if (!user) {
        return next(new ApiError("O usuario com id fornecido não foi encontrado", 404));
    }

    return response.status(200).json({
        id: user.id,
        name: user.name,
        perfil: user.perfil
    });


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
    let user = await pessoaService.findUserById(id)

    //se não existir, lanca um erro e interrompe o processo
    if (!user) {
        return next(new ApiError('Usuário não encontrado', 404));
        // Interrompe a execução se o usuário não for encontrado
    }

    const updatedUser = await pessoaService.updateUserById(id, data, senhaCriptografada);
    return response.status(200).json({
        id: updatedUser.id,
        name: updatedUser.name,
        perfil: updatedUser.perfil
    })

})

//deletar pessoa
rotas.delete('/pessoas/:id', authenticate, authorize(['ADMIN']), async (request, response, next) => {

    const id = request.params.id?.trim();
    //verifica se tem um id
    if (!id) {
        return next(new ApiError('Usuário não encontrado', 401));
    }

    //verifica se existe um usuario com o id inserido na url
    const user = await pessoaService.findUserById(id)

    if (!user) {
        return next(new ApiError('Usuário não encontrado pelo id inserido', 404));
    }

    await pessoaService.deleteUserById(id);

    return response.status(200).json({ message: `Usuário ${user.name} deletado com sucesso` });
})

export default rotas;