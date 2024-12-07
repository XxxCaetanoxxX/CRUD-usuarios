import jwt from 'jsonwebtoken';


export function authorize(allowedRoles) {
    return (request, response, next) => {
        // caso fosse const { name } = request.user; eu estaria recuperando somente o nome
        const { perfil } = request.user; //recupera o perfil da pessoa logada

        if (!perfil || !allowedRoles.includes(perfil.toUpperCase())) {
            return response.status(403).json({ error: 'Acesso negado: você não tem permissão para realizar esta ação' })
        }

        next();
    };
}

export function authenticate(request, response, next) {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) return response.status(401).json({ error: 'Token não fornecido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRETY);
        //decodifica todos os dados do usuário que vem do token
        request.user = decoded;
        next();
    } catch (error) {
        console.log(process.env.JWT_SECRETY)
        console.log(error)
        response.status(401).json({ error: 'Token inválido' })
    }

}