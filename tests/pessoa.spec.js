import { test, expect, describe } from 'vitest'
import { PessoaService } from '../services/pessoa.service'

const user = {
    name: 'user test',
    perfil: "PADRAO",
    senha: 'senhaTeste'
}

describe("Pessoas Service", () => {
    test('Deve ser possivel usar um usuário', async () => {
        const pessoaService = new PessoaService();
        const result = await pessoaService.createUser(user)
        expect(result).toHaveProperty('id')
    })
})



// describe('Pessoas Service', () => {
//     it('find all',)
// })