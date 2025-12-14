import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';
import verificarAutenticacao from '../middlewares/authmw.js';
import { body, validationResult } from 'express-validator';

const router = Router();

const validateLogin = [
    body('username')
        .notEmpty()
        .withMessage('Username é obrigatório')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username deve ter entre 3 e 50 caracteres'),
    body('senha')
        .notEmpty()
        .withMessage('Senha é obrigatória')
];

const validateUpdateProfile = [
    body('username')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username deve ter entre 3 e 50 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username deve conter apenas letras, números e underscore'),
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
        .withMessage('A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais')
];

router.post('/login', validateLogin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, senha } = req.body;

    try {
        const { rows } = await pool.query(
            'SELECT id, username, email, senha_hash FROM administrador WHERE username = $1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Username ou senha incorretos.' });
        }

        const admin = rows[0];
        const senhaValida = await bcrypt.compare(senha, admin.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Username ou senha incorretos.' });
        }

        const ownerId = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : null;
        const ownerEmail = process.env.OWNER_EMAIL || null;
        const type = (ownerId === admin.id || (ownerEmail && ownerEmail === admin.email)) ? 'Owner' : 'admin';

        const token = jwt.sign(
            { id: admin.id, username: admin.username, email: admin.email, userType: type },
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
            'SELECT id, username, email FROM administrador WHERE id = $1',
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

    const { username, email, novaSenha, senhaAtual } = req.body;

    try {
        if ((username || email || novaSenha) && !senhaAtual) {
            return res.status(400).json({ 
                error: 'Senha atual é obrigatória para alterar username, email ou senha.' 
            });
        }

        
        const { rows: adminRows } = await pool.query(
            'SELECT username, email, senha_hash FROM administrador WHERE id = $1',
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

        if (username && username !== adminAtual.username) {
            const { rows: existingUsername } = await pool.query(
                'SELECT id FROM administrador WHERE username = $1 AND id != $2',
                [username, req.userId]
            );

            if (existingUsername.length > 0) {
                return res.status(400).json({ error: 'Username já está em uso.' });
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

        const usernameFinal = username || adminAtual.username;
        const emailFinal = email || adminAtual.email;
        const senhaFinal = novaSenha ? await bcrypt.hash(novaSenha, 10) : adminAtual.senha_hash;

        
        const { rows } = await pool.query(
            'UPDATE administrador SET username = $1, email = $2, senha_hash = $3 WHERE id = $4 RETURNING id, username, email',
            [usernameFinal, emailFinal, senhaFinal, req.userId]
        );

        let newToken = null;
        if ((username && username !== adminAtual.username) || (email && email !== adminAtual.email)) {
            const ownerId = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : null;
            const ownerEmail = process.env.OWNER_EMAIL || null;
            const type = (ownerId === rows[0].id || (ownerEmail && ownerEmail === rows[0].email)) ? 'Owner' : 'admin';

            newToken = jwt.sign(
                { id: rows[0].id, username: rows[0].username, email: rows[0].email, userType: type },
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