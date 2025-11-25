import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';
import verificarAutenticacao from '../middlewares/authmw.js';
import { body, validationResult } from 'express-validator';

const router = Router();

const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail(),
    body('senha')
        .notEmpty()
        .withMessage('Senha é obrigatória')
];

const validateUpdateProfile = [
    body('email')
        .optional()
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail(),
    body('novaSenha')
        .optional()
        .isLength({ min: 8 })
        .withMessage('A nova senha deve ter no mínimo 8 caracteres')
        .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais'),
    body('senhaAtual')
        .if(body('email').exists())
        .notEmpty()
        .withMessage('Senha atual é obrigatória para alterar o email'),
    body('senhaAtual')
        .if(body('novaSenha').exists())
        .notEmpty()
        .withMessage('Senha atual é obrigatória para alterar a senha')
];

router.post('/login', validateLogin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    try {
        const { rows } = await pool.query(
            'SELECT id, email, senha_hash FROM administrador WHERE email = $1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        const admin = rows[0];
        const senhaValida = await bcrypt.compare(senha, admin.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        const ownerId = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : null;
        const ownerEmail = process.env.OWNER_EMAIL || null;
        const type = (ownerId === admin.id || (ownerEmail && ownerEmail === admin.email)) ? 'Owner' : 'admin';

        const token = jwt.sign(
            { id: admin.id, email: admin.email, userType: type },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, userType: type });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro ao processar login.' });
    }
});

router.get('/perfil', verificarAutenticacao, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, email FROM administrador WHERE id = $1',
            [req.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Administrador não encontrado.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil.' });
    }
});

router.put('/perfil', verificarAutenticacao, validateUpdateProfile, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, novaSenha, senhaAtual } = req.body;

    try {
        if ((email || novaSenha) && !senhaAtual) {
            return res.status(400).json({ 
                error: 'Senha atual é obrigatória para alterar email ou senha.' 
            });
        }

        
        const { rows: adminRows } = await pool.query(
            'SELECT email, senha_hash FROM administrador WHERE id = $1',
            [req.userId]
        );

        if (adminRows.length === 0) {
            return res.status(404).json({ error: 'Administrador não encontrado.' });
        }

        const adminAtual = adminRows[0];

        if (senhaAtual) {
            const senhaValida = await bcrypt.compare(senhaAtual, adminAtual.senha_hash);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Senha atual incorreta.' });
            }
        }

        if (email && email !== adminAtual.email) {
            const { rows: existing } = await pool.query(
                'SELECT id FROM administrador WHERE email = $1 AND id != $2',
                [email, req.userId]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email já está em uso.' });
            }
        }

        const emailFinal = email || adminAtual.email;
        const senhaFinal = novaSenha ? await bcrypt.hash(novaSenha, 10) : adminAtual.senha_hash;

        
        const { rows } = await pool.query(
            'UPDATE administrador SET email = $1, senha_hash = $2 WHERE id = $3 RETURNING id, email',
            [emailFinal, senhaFinal, req.userId]
        );

        let newToken = null;
        if (email && email !== adminAtual.email) {
            const ownerId = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : null;
            const ownerEmail = process.env.OWNER_EMAIL || null;
            const type = (ownerId === rows[0].id || (ownerEmail && ownerEmail === rows[0].email)) ? 'Owner' : 'admin';

            newToken = jwt.sign(
                { id: rows[0].id, email: rows[0].email, userType: type },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
        }

        const response = {
            message: 'Perfil atualizado com sucesso.',
            admin: rows[0]
        };

        if (newToken) {
            response.token = newToken;
        }

        res.json(response);
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
});

export default router;