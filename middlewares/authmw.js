import jwt from "jsonwebtoken";

function verificarAutenticacao(req, res, next) {
    const token = req.headers["x-access-token"] || req.headers["authorization"]?.replace("Bearer ", "");
    
    if (!token) {
        return res.status(401).json({ error: "Token não fornecido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userType = decoded.userType || null;
        req.usertype = req.userType;
        
        next();
    } catch (error) {
        console.error("Erro na verificação do token:", error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expirado." });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Token inválido." });
        }
        
        return res.status(401).json({ error: "Falha na autenticação." });
    }
}

function verificarAcessoOwner(req, res, next) {
    const token = req.headers["x-access-token"] || req.headers["authorization"]?.replace("Bearer ", "");
    
    if (!token) {
        return res.status(401).json({ error: "Token não fornecido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const ownerId = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : 1;
        const ownerEmail = process.env.OWNER_EMAIL || 'nubiarocha@gmail.com';

        if (decoded.id !== ownerId || decoded.email !== ownerEmail) {
            return res.status(403).json({ error: "Acesso negado. Apenas o Owner pode acessar este recurso." });
        }

        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userType = 'Owner';
        req.usertype = 'Owner';
        
        next();
    } catch (error) {
        console.error("Erro na verificação do token:", error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expirado." });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Token inválido." });
        }
        
        return res.status(401).json({ error: "Falha na autenticação." });
    }
}

export default verificarAutenticacao;
export { verificarAcessoOwner };