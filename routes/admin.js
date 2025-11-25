import { Router } from 'express';
import verificarAutenticacao, { verificarAcessoOwner } from "../middlewares/authmw.js";
import pool from '../lib/db.js';
import bcrypt from 'bcrypt';
import { body, param, validationResult } from 'express-validator';
import { uploadImageBuffer, removeImage, extractPathFromPublicUrl } from '../lib/supabase.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const PRODUTO_BUCKET = process.env.SUPABASE_PRODUTO_BUCKET || 'produtos';

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

const validateInstrumento = [
    body('nome')
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 3, max: 100 })
        .withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('descricao')
        .notEmpty()
        .withMessage('Descrição é obrigatória')
        .isLength({ min: 10, max: 500 })
        .withMessage('Descrição deve ter entre 10 e 500 caracteres')
];

const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID deve ser um número inteiro positivo')
];

const validateRegister = [
    body('email')
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail(),
    body('senha')
        .isLength({ min: 8 })
        .withMessage('A senha deve ter no mínimo 8 caracteres')
        .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais')
];

const validateAdminEmail = [
    body('email')
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail(),
];

const validateProfessor = [
    body('nome')
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
];

 
router.post('/produtos', verificarAutenticacao, upload.array('imagens'), validateProduto, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, preco, imagensToAdd } = req.body;

    try {
        const imagens = [];

        
        const files = req.files || [];
        for (const file of files) {
            const buffer = file.buffer;
            const mime = file.mimetype || 'image/jpeg';
            const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
            const filename = `produtos/${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
            const publicUrl = await uploadImageBuffer(PRODUTO_BUCKET, filename, buffer, mime);
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
                const publicUrl = await uploadImageBuffer(PRODUTO_BUCKET, filename, buffer, 'image/jpeg');
                imagens.push(publicUrl);
            }
        }

        const { rows } = await pool.query(
            'INSERT INTO produto (nome, preco, imagens) VALUES ($1, $2, $3) RETURNING *',
            [nome, preco, imagens]
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
    const { nome, preco, imagensToAdd, imagensToRemove } = req.body;

    try {
        const { rows: prodRows } = await pool.query('SELECT imagens FROM produto WHERE id = $1', [id]);
        if (prodRows.length === 0) return res.status(404).json({ error: 'Produto não encontrado.' });

        let imagens = prodRows[0].imagens || [];

        
        let toRemove = imagensToRemove;
        if (typeof imagensToRemove === 'string' && imagensToRemove.trim().startsWith('[')) {
            try { toRemove = JSON.parse(imagensToRemove); } catch (e) { toRemove = imagensToRemove; }
        }
        if (Array.isArray(toRemove) && toRemove.length > 0) {
            for (const url of toRemove) {
                const path = extractPathFromPublicUrl(url, PRODUTO_BUCKET);
                if (path) {
                    try { await removeImage(PRODUTO_BUCKET, path); } catch (e) { console.warn('Falha ao remover imagem do storage', e.message); }
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
            const publicUrl = await uploadImageBuffer(PRODUTO_BUCKET, filename, buffer, mime);
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
                const publicUrl = await uploadImageBuffer(PRODUTO_BUCKET, filename, buffer, 'image/jpeg');
                imagens.push(publicUrl);
            }
        }

        const { rows, rowCount } = await pool.query(
            'UPDATE produto SET nome = $1, preco = $2, imagens = $3 WHERE id = $4 RETURNING *',
            [nome, preco, imagens, id]
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
            const path = extractPathFromPublicUrl(url, PRODUTO_BUCKET);
            if (path) {
                try { await removeImage(PRODUTO_BUCKET, path); } catch (e) { console.warn('Falha ao remover imagem do storage', e.message); }
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

 

router.post('/instrumentos', verificarAutenticacao, validateInstrumento, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, descricao } = req.body;

    try {
        const { rows } = await pool.query(
            'INSERT INTO instrumento (nome, descricao) VALUES ($1, $2) RETURNING *',
            [nome, descricao]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao criar instrumento:', error);
        res.status(500).json({ error: 'Erro ao criar instrumento.' });
    }
});

router.put('/instrumentos/:id', verificarAutenticacao, validateId, validateInstrumento, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nome, descricao } = req.body;

    try {
        const { rows, rowCount } = await pool.query(
            'UPDATE instrumento SET nome = $1, descricao = $2 WHERE id = $3 RETURNING *',
            [nome, descricao, id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Instrumento não encontrado.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar instrumento:', error);
        res.status(500).json({ error: 'Erro ao atualizar instrumento.' });
    }
});

router.delete('/instrumentos/:id', verificarAutenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await pool.query('DELETE FROM instrumento WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Instrumento não encontrado.' });
        }

        res.json({ message: 'Instrumento deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar instrumento:', error);
        res.status(500).json({ error: 'Erro ao deletar instrumento.' });
    }
});

 

router.post('/professores', verificarAutenticacao, validateProfessor, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome } = req.body;
    try {
        const { rows } = await pool.query('INSERT INTO professor (nome) VALUES ($1) RETURNING *', [nome]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao criar professor:', error);
        res.status(500).json({ error: 'Erro ao criar professor.' });
    }
});

router.get('/professores', verificarAutenticacao, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome FROM professor ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar professores:', error);
        res.status(500).json({ error: 'Erro ao buscar professores.' });
    }
});

router.put('/professores/:id', verificarAutenticacao, validateId, validateProfessor, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { nome } = req.body;
    try {
        const { rows } = await pool.query('UPDATE professor SET nome = $1 WHERE id = $2 RETURNING *', [nome, id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Professor não encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar professor:', error);
        res.status(500).json({ error: 'Erro ao atualizar professor.' });
    }
});

router.delete('/professores/:id', verificarAutenticacao, validateId, async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query('DELETE FROM professor WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Professor não encontrado.' });
        res.json({ message: 'Professor deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar professor:', error);
        res.status(500).json({ error: 'Erro ao deletar professor.' });
    }
});

router.post('/professores/:id/instrumentos', verificarAutenticacao, validateId, body('instrumento_id').isInt({ min: 1 }), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { instrumento_id } = req.body;
    try {
        await pool.query('INSERT INTO professor_instrumento (professor_id, instrumento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, instrumento_id]);
        res.json({ message: 'Instrumento associado ao professor.' });
    } catch (error) {
        console.error('Erro ao associar instrumento:', error);
        res.status(500).json({ error: 'Erro ao associar instrumento.' });
    }
});

router.delete('/professores/:id/instrumentos/:instrumentoId', verificarAutenticacao, validateId, async (req, res) => {
    const { id, instrumentoId } = req.params;
    try {
        const { rowCount } = await pool.query('DELETE FROM professor_instrumento WHERE professor_id = $1 AND instrumento_id = $2', [id, instrumentoId]);
        if (rowCount === 0) return res.status(404).json({ error: 'Associação não encontrada.' });
        res.json({ message: 'Associação removida.' });
    } catch (error) {
        console.error('Erro ao remover associação:', error);
        res.status(500).json({ error: 'Erro ao remover associação.' });
    }
});

 

router.post('/administradores', verificarAcessoOwner, validateRegister, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, senha } = req.body;

    try {
        const { rows: existing } = await pool.query('SELECT id FROM administrador WHERE email = $1', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const { rows } = await pool.query(
            'INSERT INTO administrador (email, senha_hash) VALUES ($1, $2) RETURNING id, email',
            [email, senhaHash]
        );

        res.status(201).json({ message: 'Administrador criado com sucesso.', admin: rows[0] });
    } catch (error) {
        console.error('Erro ao criar administrador:', error);
        res.status(500).json({ error: 'Erro ao criar administrador.' });
    }
});

router.get('/administradores', verificarAcessoOwner, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, email FROM administrador ORDER BY id');
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
            'SELECT id, email FROM administrador WHERE id = $1',
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

router.put('/administradores/:id', verificarAcessoOwner, validateId, validateAdminEmail, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email } = req.body;

    try {
        const { rows: existing } = await pool.query('SELECT id FROM administrador WHERE email = $1 AND id != $2', [email, id]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email já está em uso.' });

        const { rows } = await pool.query(
            'UPDATE administrador SET email = $1 WHERE id = $2 RETURNING id, email',
            [email, id]
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