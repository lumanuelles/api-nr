import { Router } from 'express';
import verificarAutenticacao, { verificarAcessoOwner } from "../middlewares/authmw.js";
import pool from '../lib/db.js';
import bcrypt from 'bcrypt';
import { body, param, validationResult } from 'express-validator';
import { uploadImageBuffer, removeImage, extractPathFromPublicUrl } from '../lib/blob.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

const validateProduto = [
    body('nome')
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 3, max: 100 })
        .withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('preco')
        .notEmpty()
        .withMessage('Preço é obrigatório')
        .isFloat({ min: 0 })
        .withMessage('Preço deve ser um número positivo')
];



const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID deve ser um número inteiro positivo')
];

const validateRegister = [
    body('username')
        .notEmpty()
        .withMessage('Usuário é obrigatório')
        .isLength({ min: 3, max: 50 })
        .withMessage('Usuário deve ter entre 3 e 50 caracteres')
        .matches(/^[a-zA-Z0-9_.]+$/)
        .withMessage('Usuário deve conter apenas letras, números, underscore e ponto'),
    body('email')
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail(),
    body('senha')
        .isLength({ min: 6, max: 50 })
        .withMessage('A senha deve ter entre 6 e 50 caracteres')
];

const validateAdminUpdate = [
    body('username')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('Usuário deve ter entre 3 e 50 caracteres')
        .matches(/^[a-zA-Z0-9_.]+$/)
        .withMessage('Usuário deve conter apenas letras, números, underscore e ponto'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail(),
];


router.post('/produtos', verificarAutenticacao, upload.array('imagens'), validateProduto, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, preco, imagensToAdd, estoque } = req.body;

    try {
        const imagens = [];

        const files = req.files || [];
        for (const file of files) {
            const buffer = file.buffer;
            const mime = file.mimetype || 'image/jpeg';
            const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
            const filename = `produtos/${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
            const publicUrl = await uploadImageBuffer(null, filename, buffer, mime);
            imagens.push(publicUrl);
        }

        let b64list = imagensToAdd;
        if (typeof imagensToAdd === 'string' && imagensToAdd.trim().startsWith('[')) {
            try { b64list = JSON.parse(imagensToAdd); } catch (e) { b64list = imagensToAdd; }
        }
        if (Array.isArray(b64list) && b64list.length > 0) {
            for (const b64 of b64list) {
                if (!b64) continue;
                const buffer = Buffer.from(b64, 'base64');
                const filename = `produtos/${Date.now()}_${Math.random().toString(36).slice(2,10)}.jpg`;
                const publicUrl = await uploadImageBuffer(null, filename, buffer, 'image/jpeg');
                imagens.push(publicUrl);
            }
        }

        // estoque: default 0 if not provided
        const estoqueFinal = (estoque !== undefined && estoque !== null && estoque !== '') ? parseInt(estoque, 10) : 0;

        const { rows } = await pool.query(
            'INSERT INTO produto (nome, preco, imagens, estoque) VALUES ($1, $2, $3, $4) RETURNING *',
            [nome, preco, imagens, estoqueFinal]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto.' });
    }
});

 
router.put('/produtos/:id', verificarAutenticacao, upload.array('imagens'), validateId, validateProduto, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nome, preco, imagensToAdd, imagensToRemove, estoque } = req.body;

    try {
        const { rows: prodRows } = await pool.query('SELECT imagens, estoque FROM produto WHERE id = $1', [id]);
        if (prodRows.length === 0) return res.status(404).json({ error: 'Produto não encontrado.' });

        let imagens = prodRows[0].imagens || [];
        let estoqueAtual = prodRows[0].estoque;

        let toRemove = imagensToRemove;
        if (typeof imagensToRemove === 'string' && imagensToRemove.trim().startsWith('[')) {
            try { toRemove = JSON.parse(imagensToRemove); } catch (e) { toRemove = imagensToRemove; }
        }
        if (Array.isArray(toRemove) && toRemove.length > 0) {
            for (const url of toRemove) {
                const path = extractPathFromPublicUrl(url, null);
                if (path) {
                    try { await removeImage(null, path); } catch (e) { console.warn('Falha ao remover imagem do storage', e.message); }
                }
                imagens = imagens.filter(i => i !== url);
            }
        }

        const files = req.files || [];
        for (const file of files) {
            const buffer = file.buffer;
            const mime = file.mimetype || 'image/jpeg';
            const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
            const filename = `produtos/${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
            const publicUrl = await uploadImageBuffer(null, filename, buffer, mime);
            imagens.push(publicUrl);
        }

        let b64list = imagensToAdd;
        if (typeof imagensToAdd === 'string' && imagensToAdd.trim().startsWith('[')) {
            try { b64list = JSON.parse(imagensToAdd); } catch (e) { b64list = imagensToAdd; }
        }
        if (Array.isArray(b64list) && b64list.length > 0) {
            for (const b64 of b64list) {
                if (!b64) continue;
                const buffer = Buffer.from(b64, 'base64');
                const filename = `produtos/${Date.now()}_${Math.random().toString(36).slice(2,10)}.jpg`;
                const publicUrl = await uploadImageBuffer(null, filename, buffer, 'image/jpeg');
                imagens.push(publicUrl);
            }
        }

        // estoque: if provided, update, else keep current
        const estoqueFinal = (estoque !== undefined && estoque !== null && estoque !== '') ? parseInt(estoque, 10) : estoqueAtual;

        const { rows, rowCount } = await pool.query(
            'UPDATE produto SET nome = $1, preco = $2, imagens = $3, estoque = $4 WHERE id = $5 RETURNING *',
            [nome, preco, imagens, estoqueFinal, id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

router.delete('/produtos/:id', verificarAutenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await pool.query('SELECT imagens FROM produto WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado.' });

        const imagens = rows[0].imagens || [];
        for (const url of imagens) {
            const path = extractPathFromPublicUrl(url, null);
            if (path) {
                try { await removeImage(null, path); } catch (e) { console.warn('Falha ao remover imagem do storage', e.message); }
            }
        }

        const { rowCount } = await pool.query('DELETE FROM produto WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Produto não encontrado.' });

        res.json({ message: 'Produto deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto.' });
    }
});

router.post('/administradores', verificarAcessoOwner, validateRegister, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { username, email, senha } = req.body;

    try {
        const { rows: existingUsername } = await pool.query('SELECT id FROM administrador WHERE username = $1', [username]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'Usuário já cadastrado.' });
        }

        const { rows: existing } = await pool.query('SELECT id FROM administrador WHERE email = $1', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const { rows } = await pool.query(
            'INSERT INTO administrador (username, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, senhaHash]
        );

        res.status(201).json({ message: 'Administrador criado com sucesso.', admin: rows[0] });
    } catch (error) {
        console.error('Erro ao criar administrador:', error);
        res.status(500).json({ error: 'Erro ao criar administrador. Tente novamente mais tarde.' });
    }
});

router.get('/administradores', verificarAcessoOwner, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, username, email FROM administrador ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar administradores:', error);
        res.status(500).json({ error: 'Erro ao buscar administradores.' });
    }
});

router.get('/administradores/:id', verificarAcessoOwner, validateId, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
        const { rows } = await pool.query(
            'SELECT id, username, email FROM administrador WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Administrador não encontrado.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar administrador:', error);
        res.status(500).json({ error: 'Erro ao buscar administrador.' });
    }
});

router.put('/administradores/:id', verificarAcessoOwner, validateId, validateAdminUpdate, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { username, email } = req.body;

    try {
        if (!username && !email) {
            return res.status(400).json({ error: 'Pelo menos username ou email deve ser fornecido.' });
        }

        const { rows: currentAdmin } = await pool.query('SELECT username, email FROM administrador WHERE id = $1', [id]);
        if (currentAdmin.length === 0) {
            return res.status(404).json({ error: 'Administrador não encontrado.' });
        }

        const usernameFinal = username || currentAdmin[0].username;
        const emailFinal = email || currentAdmin[0].email;

        if (username && username !== currentAdmin[0].username) {
            const { rows: existingUsername } = await pool.query('SELECT id FROM administrador WHERE username = $1 AND id != $2', [username, id]);
            if (existingUsername.length > 0) {
                return res.status(400).json({ error: 'Usuário já está em uso.' });
            }
        }

        if (email && email !== currentAdmin[0].email) {
            const { rows: existing } = await pool.query('SELECT id FROM administrador WHERE email = $1 AND id != $2', [email, id]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email já está em uso.' });
            }
        }

        const { rows } = await pool.query(
            'UPDATE administrador SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email',
            [usernameFinal, emailFinal, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Administrador não encontrado.' });
        }

        res.json({ message: 'Administrador atualizado com sucesso.', admin: rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar administrador:', error);
        res.status(500).json({ error: 'Erro ao atualizar administrador.' });
    }
});

router.delete('/administradores/:id', verificarAcessoOwner, validateId, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    if (parseInt(id) === 1) {
        return res.status(403).json({ error: 'Não é possível deletar o Owner.' });
    }

    try {
        const { rowCount } = await pool.query('DELETE FROM administrador WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Administrador não encontrado.' });
        }

        res.json({ message: 'Administrador deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar administrador:', error);
        res.status(500).json({ error: 'Erro ao deletar administrador.' });
    }
});

export default router;